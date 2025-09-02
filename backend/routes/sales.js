const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken, requireBiller } = require('../middleware/auth');

const router = express.Router();

// Create new sale (Biller+ access)
router.post('/', [
  verifyToken,
  requireBiller,
  body('items').isArray({ min: 1 }).withMessage('Items array is required and must not be empty'),
  body('items.*.product_id').isInt().withMessage('Valid product ID is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('payment_method').isIn(['cash', 'card', 'upi', 'mixed']).withMessage('Valid payment method is required'),
  body('customer_name').optional().trim(),
  body('customer_phone').optional().trim()
], async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    await connection.beginTransaction();

    const {
      items,
      customer_name,
      customer_phone,
      payment_method,
      discount_amount = 0,
      notes = ''
    } = req.body;

    // Generate invoice number
    const [invoiceResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM sales WHERE DATE(sale_date) = CURDATE()'
    );
    const dailyCount = invoiceResult[0].count + 1;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoice_no = `INV${today}${dailyCount.toString().padStart(4, '0')}`;

    let subtotal = 0;
    let total_tax = 0;
    const saleItems = [];

    // Validate items and calculate totals
    for (const item of items) {
      const [products] = await connection.execute(
        'SELECT id, name, price, tax_percentage, stock_quantity FROM products WHERE id = ? AND status = "active"',
        [item.product_id]
      );

      if (products.length === 0) {
        throw new Error(`Product with ID ${item.product_id} not found or inactive`);
      }

      const product = products[0];

      // Check stock availability
      if (product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, Required: ${item.quantity}`);
      }

      const unit_price = product.price;
      const line_subtotal = unit_price * item.quantity;
      const tax_amount = (line_subtotal * product.tax_percentage) / 100;
      const line_total = line_subtotal + tax_amount;

      subtotal += line_subtotal;
      total_tax += tax_amount;

      saleItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price,
        tax_percentage: product.tax_percentage,
        tax_amount,
        line_total
      });
    }

    const total_amount = subtotal + total_tax - discount_amount;

    // Insert sale record
    const [saleResult] = await connection.execute(`
      INSERT INTO sales 
      (invoice_no, biller_id, customer_name, customer_phone, subtotal, tax_amount, 
       discount_amount, total_amount, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice_no, req.user.id, customer_name, customer_phone, subtotal,
      total_tax, discount_amount, total_amount, payment_method, notes
    ]);

    const sale_id = saleResult.insertId;

    // Insert sale items and update stock
    for (const item of saleItems) {
      // Insert sale item
      await connection.execute(`
        INSERT INTO sale_items 
        (sale_id, product_id, quantity, unit_price, tax_percentage, tax_amount, line_total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        sale_id, item.product_id, item.quantity, item.unit_price,
        item.tax_percentage, item.tax_amount, item.line_total
      ]);

      // Update product stock
      await connection.execute(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Sale completed successfully',
      sale: {
        id: sale_id,
        invoice_no,
        total_amount,
        items_count: items.length
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Sale creation error:', error);
    
    if (error.message.includes('not found') || error.message.includes('Insufficient stock')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  } finally {
    connection.release();
  }
});

// Get sales with pagination and filtering
router.get('/', [
  verifyToken,
  requireBiller
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { start_date, end_date, biller_id, payment_method } = req.query;

    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    if (start_date) {
      whereClause += ' AND DATE(s.sale_date) >= ?';
      queryParams.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND DATE(s.sale_date) <= ?';
      queryParams.push(end_date);
    }

    if (biller_id) {
      whereClause += ' AND s.biller_id = ?';
      queryParams.push(biller_id);
    }

    if (payment_method) {
      whereClause += ' AND s.payment_method = ?';
      queryParams.push(payment_method);
    }

    const query = `
      SELECT 
        s.*,
        u.username as biller_name,
        COUNT(si.id) as items_count
      FROM sales s
      LEFT JOIN users u ON s.biller_id = u.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.sale_date DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);

    const [sales] = await db.execute(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM sales s
      ${whereClause}
    `;
    const [countResult] = await db.execute(countQuery, queryParams.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      sales,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single sale with items
router.get('/:id', [verifyToken, requireBiller], async (req, res) => {
  try {
    const { id } = req.params;

    // Get sale details
    const [sales] = await db.execute(`
      SELECT 
        s.*,
        u.username as biller_name
      FROM sales s
      LEFT JOIN users u ON s.biller_id = u.id
      WHERE s.id = ?
    `, [id]);

    if (sales.length === 0) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    // Get sale items
    const [items] = await db.execute(`
      SELECT 
        si.*,
        p.name as product_name,
        p.brand,
        p.volume
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
      ORDER BY si.id
    `, [id]);

    const sale = sales[0];
    sale.items = items;

    res.json(sale);

  } catch (error) {
    console.error('Get sale details error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get today's sales summary
router.get('/summary/today', [verifyToken, requireBiller], async (req, res) => {
  try {
    const [summary] = await db.execute(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(AVG(total_amount), 0) as average_sale
      FROM sales 
      WHERE DATE(sale_date) = CURDATE()
    `);

    const [paymentBreakdown] = await db.execute(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(total_amount) as amount
      FROM sales 
      WHERE DATE(sale_date) = CURDATE()
      GROUP BY payment_method
    `);

    res.json({
      summary: summary[0],
      paymentBreakdown
    });

  } catch (error) {
    console.error('Today summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search products for POS (optimized for billing)
router.get('/pos/products/search', [verifyToken, requireBiller], async (req, res) => {
  try {
    const { q } = req.query; // search query
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${q.trim()}%`;

    const [products] = await db.execute(`
      SELECT 
        p.id,
        p.name,
        p.barcode,
        p.price,
        p.tax_percentage,
        p.stock_quantity,
        p.brand,
        p.volume,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active' 
        AND p.stock_quantity > 0
        AND (p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ?)
      ORDER BY p.name
      LIMIT 20
    `, [searchTerm, searchTerm, searchTerm]);

    res.json({ products });

  } catch (error) {
    console.error('Product search error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
