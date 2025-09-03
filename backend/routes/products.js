const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { verifyToken, requireManager, requireBiller } = require('../middleware/auth');

const router = express.Router();

// Get all products with pagination and filtering
router.get('/', [
  verifyToken,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isInt().withMessage('Category must be a valid ID'),
  query('search').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { category_id, search, status = 'active' } = req.query;

    let whereClause = 'WHERE p.status = ?';
    let queryParams = [status];

    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      queryParams.push(parseInt(category_id));
    }

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Get products with category information
    const query = `
      SELECT 
        p.id,
        p.name,
        p.category_id,
        p.barcode,
        p.price,
        p.unit_price,
        p.cost_price,
        p.stock_quantity,
        p.min_stock_level,
        p.tax_percentage,
        p.brand,
        p.volume,
        p.alcohol_percentage,
        p.description,
        p.status,
        p.created_at,
        p.updated_at,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.name
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);

    console.log('Query:', query);
    console.log('Params:', queryParams);

    const [products] = await db.execute(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `;
    const countParams = queryParams.slice(0, -2); // Remove LIMIT and OFFSET
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      message: 'Products retrieved successfully',
      data: products,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single product by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [products] = await db.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        sc.name as subcategory_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories sc ON p.subcategory_id = sc.id
      WHERE p.id = ?
    `, [id]);

    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(products[0]);

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new product (Manager+ only)
router.post('/', [
  verifyToken,
  requireManager,
  body('name').notEmpty().withMessage('Product name is required'),
  body('category_id').isInt().withMessage('Valid category ID is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('min_stock_level').optional().isInt({ min: 0 }).withMessage('Minimum stock level must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name, category_id, subcategory_id, barcode, price, cost_price,
      stock_quantity = 0, min_stock_level = 10, tax_percentage = 0,
      brand, volume, alcohol_percentage, description
    } = req.body;

    // Check if barcode already exists
    if (barcode) {
      const [existingProducts] = await db.execute(
        'SELECT id FROM products WHERE barcode = ?',
        [barcode]
      );
      if (existingProducts.length > 0) {
        return res.status(400).json({ message: 'Product with this barcode already exists' });
      }
    }

    const [result] = await db.execute(`
      INSERT INTO products 
      (name, category_id, subcategory_id, barcode, price, cost_price, stock_quantity, 
       min_stock_level, tax_percentage, brand, volume, alcohol_percentage, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, category_id, subcategory_id, barcode, price, cost_price,
      stock_quantity, min_stock_level, tax_percentage, brand, volume,
      alcohol_percentage, description
    ]);

    res.status(201).json({
      message: 'Product created successfully',
      productId: result.insertId
    });

  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Product with this barcode already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Update product (Manager+ only)
router.put('/:id', [
  verifyToken,
  requireManager,
  body('name').optional().notEmpty().withMessage('Product name cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateFields = {};
    const allowedFields = [
      'name', 'category_id', 'subcategory_id', 'barcode', 'price', 'cost_price',
      'stock_quantity', 'min_stock_level', 'tax_percentage', 'brand', 'volume',
      'alcohol_percentage', 'description', 'status'
    ];

    // Build update query dynamically
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const setClause = Object.keys(updateFields).map(field => `${field} = ?`).join(', ');
    const values = Object.values(updateFields);
    values.push(id);

    const [result] = await db.execute(
      `UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully' });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get low stock products
router.get('/alerts/low-stock', verifyToken, async (req, res) => {
  try {
    const [products] = await db.execute(`
      SELECT 
        p.*,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.stock_quantity <= p.min_stock_level AND p.status = 'active'
      ORDER BY (p.stock_quantity / p.min_stock_level) ASC
    `);

    res.json({ lowStockProducts: products });

  } catch (error) {
    console.error('Low stock error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all categories
router.get('/categories/all', verifyToken, async (req, res) => {
  try {
    const [categories] = await db.execute(`
      SELECT 
        c.*,
        parent.name as parent_name,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      LEFT JOIN products p ON c.id = p.category_id OR c.id = p.subcategory_id
      GROUP BY c.id
      ORDER BY c.parent_id IS NULL DESC, c.name
    `);

    res.json({ categories });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
