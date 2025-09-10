const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { verifyToken, requireManager, requireBiller } = require('../middleware/auth');

const router = express.Router();

// Test endpoint for POS without authentication (for development) - MUST BE FIRST
router.get('/test', async (req, res) => {
  try {
    const { search, id } = req.query;
    
    // If ID is provided, return single product
    if (id) {
      const product = await Product.findById(id)
        .populate('category_id', 'name')
        .populate('subcategory_id', 'name');

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const responseProduct = {
        id: product._id.toString(),
        _id: product._id,
        name: product.name,
        category: product.category_id?.name || 'Unknown',
        category_name: product.category_id?.name || 'Unknown',
        category_id: product.category_id?._id,
        price: product.price || product.unit_price,
        cost_price: product.cost_price || 0,
        stock: product.stock_quantity,
        stock_quantity: product.stock_quantity,
        barcode: product.barcode || '',
        volume: product.volume || '',
        brand: product.brand || '',
        alcohol_content: product.alcohol_percentage,
        min_stock_level: product.min_stock_level,
        tax_percentage: product.tax_percentage,
        status: product.status
      };

      return res.json({ data: responseProduct });
    }

    // Otherwise return list of products
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build filter for search
    let filter = { status: 'active' };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    // Get products with category information
    const products = await Product.find(filter)
      .populate('category_id', 'name')
      .populate('subcategory_id', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

    // Map products to include flat category name and proper ID
    const mappedProducts = products.map(product => ({
      id: product._id.toString(),
      _id: product._id,
      name: product.name,
      category: product.category_id?.name || 'Unknown',
      category_name: product.category_id?.name || 'Unknown',
      category_id: product.category_id?._id,
      price: product.price || product.unit_price,
      cost_price: product.cost_price || 0,
      stock: product.stock_quantity,
      stock_quantity: product.stock_quantity,
      barcode: product.barcode || '',
      volume: product.volume || '',
      brand: product.brand || '',
      alcohol_content: product.alcohol_percentage,
      min_stock_level: product.min_stock_level,
      tax_percentage: product.tax_percentage,
      status: product.status
    }));

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    res.json({
      data: mappedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test POST endpoint for creating products without authentication (for development)
router.post('/test', async (req, res) => {
  try {
    const {
      name, category_id, barcode, price, stock_quantity = 0, 
      volume, brand, alcohol_percentage, description
    } = req.body;

    console.log('Received product data:', req.body);

    // Validate required fields
    if (!name || !category_id || !price) {
      return res.status(400).json({ 
        message: 'Name, category_id, and price are required' 
      });
    }

    // Check if barcode already exists (if provided)
    if (barcode) {
      const existingProduct = await Product.findOne({ barcode });
      if (existingProduct) {
        return res.status(400).json({ 
          message: 'Product with this barcode already exists' 
        });
      }
    }

    // Create new product
    const newProduct = new Product({
      name,
      category_id,
      barcode: barcode || undefined,
      price: Number(price),
      unit_price: Number(price), // Set unit_price same as price
      stock_quantity: Number(stock_quantity) || 0,
      min_stock_level: 10,
      volume: volume || '',
      brand: brand || '',
      alcohol_percentage: alcohol_percentage ? Number(alcohol_percentage) : undefined,
      description: description || '',
      status: 'active'
    });

    const savedProduct = await newProduct.save();
    
    // Populate category for response
    await savedProduct.populate('category_id', 'name');

    const responseProduct = {
      id: savedProduct._id.toString(),
      _id: savedProduct._id,
      name: savedProduct.name,
      category: savedProduct.category_id?.name || 'Unknown',
      category_name: savedProduct.category_id?.name || 'Unknown',
      category_id: savedProduct.category_id?._id,
      price: savedProduct.price,
      stock: savedProduct.stock_quantity,
      stock_quantity: savedProduct.stock_quantity,
      barcode: savedProduct.barcode || '',
      volume: savedProduct.volume || '',
      brand: savedProduct.brand || '',
      alcohol_content: savedProduct.alcohol_percentage,
      min_stock_level: savedProduct.min_stock_level,
      status: savedProduct.status
    };

    console.log('Product created successfully:', responseProduct);

    res.status(201).json({
      message: 'Product created successfully',
      data: responseProduct
    });
  } catch (error) {
    console.error('Test POST endpoint error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Product with this barcode already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
});

// Test PUT endpoint for updating products without authentication (for development)
router.put('/test', async (req, res) => {
  try {
    const {
      id, name, category_id, barcode, price, stock_quantity, 
      volume, brand, alcohol_percentage, description
    } = req.body;

    console.log('Received product update data:', req.body);

    // Validate required fields
    if (!id) {
      return res.status(400).json({ 
        message: 'Product ID is required for update' 
      });
    }

    const updateFields = {};
    
    if (name) updateFields.name = name;
    if (category_id) updateFields.category_id = category_id;
    if (barcode !== undefined) updateFields.barcode = barcode || undefined;
    if (price !== undefined) {
      updateFields.price = Number(price);
      updateFields.unit_price = Number(price);
    }
    if (stock_quantity !== undefined) updateFields.stock_quantity = Number(stock_quantity);
    if (volume !== undefined) updateFields.volume = volume;
    if (brand !== undefined) updateFields.brand = brand;
    if (alcohol_percentage !== undefined) updateFields.alcohol_percentage = alcohol_percentage ? Number(alcohol_percentage) : undefined;
    if (description !== undefined) updateFields.description = description;

    // Check if barcode already exists for another product (if updating barcode)
    if (updateFields.barcode) {
      const existingProduct = await Product.findOne({ 
        barcode: updateFields.barcode,
        _id: { $ne: id }
      });
      if (existingProduct) {
        return res.status(400).json({ 
          message: 'Product with this barcode already exists' 
        });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('category_id', 'name');

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const responseProduct = {
      id: updatedProduct._id.toString(),
      _id: updatedProduct._id,
      name: updatedProduct.name,
      category: updatedProduct.category_id?.name || 'Unknown',
      category_name: updatedProduct.category_id?.name || 'Unknown',
      category_id: updatedProduct.category_id?._id,
      price: updatedProduct.price,
      stock: updatedProduct.stock_quantity,
      stock_quantity: updatedProduct.stock_quantity,
      barcode: updatedProduct.barcode || '',
      volume: updatedProduct.volume || '',
      brand: updatedProduct.brand || '',
      alcohol_content: updatedProduct.alcohol_percentage,
      min_stock_level: updatedProduct.min_stock_level,
      status: updatedProduct.status
    };

    console.log('Product updated successfully:', responseProduct);

    res.json({
      message: 'Product updated successfully',
      data: responseProduct
    });
  } catch (error) {
    console.error('Test PUT endpoint error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Product with this barcode already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
});

// Get all products with pagination and filtering (authenticated)
router.get('/', [
  verifyToken,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('category_id').optional().isMongoId().withMessage('Category must be a valid MongoDB ID'),
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
    const skip = (page - 1) * limit;
    const { category_id, search, status = 'active' } = req.query;

    // Build filter
    let filter = { status };

    if (category_id) {
      filter.category_id = category_id;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    // Get products with category information
    const products = await Product.find(filter)
      .populate('category_id', 'name')
      .populate('subcategory_id', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

    // Map products to include flat category name and proper ID
    const mappedProducts = products.map(product => ({
      id: product._id.toString(),
      _id: product._id,
      name: product.name,
      category: product.category_id?.name || 'Unknown',
      category_name: product.category_id?.name || 'Unknown',
      category_id: product.category_id?._id,
      price: product.price || product.unit_price,
      cost_price: product.cost_price || 0,
      stock: product.stock_quantity,
      stock_quantity: product.stock_quantity,
      barcode: product.barcode || '',
      volume: product.volume || '',
      brand: product.brand || '',
      alcohol_content: product.alcohol_percentage,
      min_stock_level: product.min_stock_level,
      tax_percentage: product.tax_percentage,
      status: product.status,
      created_at: product.created_at,
      updated_at: product.updated_at
    }));

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    res.json({
      message: 'Products retrieved successfully',
      data: mappedProducts,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get single product by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('category_id', 'name')
      .populate('subcategory_id', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const responseProduct = {
      id: product._id.toString(),
      _id: product._id,
      name: product.name,
      category: product.category_id?.name || 'Unknown',
      category_name: product.category_id?.name || 'Unknown',
      category_id: product.category_id?._id,
      price: product.price || product.unit_price,
      stock: product.stock_quantity,
      stock_quantity: product.stock_quantity,
      barcode: product.barcode || '',
      volume: product.volume || '',
      brand: product.brand || '',
      alcohol_content: product.alcohol_percentage,
      min_stock_level: product.min_stock_level,
      tax_percentage: product.tax_percentage,
      status: product.status,
      created_at: product.created_at,
      updated_at: product.updated_at
    };

    res.json(responseProduct);

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
  body('category_id').isMongoId().withMessage('Valid category ID is required'),
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

    console.log('Received authenticated product data:', req.body);

    // Check if barcode already exists (if provided)
    if (barcode) {
      const existingProduct = await Product.findOne({ barcode });
      if (existingProduct) {
        return res.status(400).json({ 
          message: 'Product with this barcode already exists' 
        });
      }
    }

    // Create new product
    const newProduct = new Product({
      name,
      category_id,
      subcategory_id: subcategory_id || undefined,
      barcode: barcode || undefined,
      price: Number(price),
      unit_price: Number(price), // Set unit_price same as price
      cost_price: cost_price ? Number(cost_price) : undefined,
      stock_quantity: Number(stock_quantity) || 0,
      min_stock_level: Number(min_stock_level) || 10,
      tax_percentage: Number(tax_percentage) || 0,
      volume: volume || '',
      brand: brand || '',
      alcohol_percentage: alcohol_percentage ? Number(alcohol_percentage) : undefined,
      description: description || '',
      status: 'active'
    });

    const savedProduct = await newProduct.save();
    
    // Populate category for response
    await savedProduct.populate('category_id', 'name');

    const responseProduct = {
      id: savedProduct._id.toString(),
      _id: savedProduct._id,
      name: savedProduct.name,
      category: savedProduct.category_id?.name || 'Unknown',
      category_name: savedProduct.category_id?.name || 'Unknown',
      category_id: savedProduct.category_id?._id,
      price: savedProduct.price,
      stock: savedProduct.stock_quantity,
      stock_quantity: savedProduct.stock_quantity,
      barcode: savedProduct.barcode || '',
      volume: savedProduct.volume || '',
      brand: savedProduct.brand || '',
      alcohol_content: savedProduct.alcohol_percentage,
      min_stock_level: savedProduct.min_stock_level,
      status: savedProduct.status
    };

    console.log('Authenticated product created successfully:', responseProduct);

    res.status(201).json({
      message: 'Product created successfully',
      data: responseProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Product with this barcode already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error', error: error.message });
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

    // Only include fields that are provided in the request
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
        // Also update unit_price when price is updated
        if (field === 'price') {
          updateFields.unit_price = req.body[field];
        }
      }
    }

    // Check if barcode already exists for another product (if updating barcode)
    if (updateFields.barcode) {
      const existingProduct = await Product.findOne({ 
        barcode: updateFields.barcode,
        _id: { $ne: id }
      });
      if (existingProduct) {
        return res.status(400).json({ 
          message: 'Product with this barcode already exists' 
        });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('category_id', 'name');

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const responseProduct = {
      id: updatedProduct._id.toString(),
      _id: updatedProduct._id,
      name: updatedProduct.name,
      category: updatedProduct.category_id?.name || 'Unknown',
      category_name: updatedProduct.category_id?.name || 'Unknown',
      category_id: updatedProduct.category_id?._id,
      price: updatedProduct.price,
      stock: updatedProduct.stock_quantity,
      stock_quantity: updatedProduct.stock_quantity,
      barcode: updatedProduct.barcode || '',
      volume: updatedProduct.volume || '',
      brand: updatedProduct.brand || '',
      alcohol_content: updatedProduct.alcohol_percentage,
      min_stock_level: updatedProduct.min_stock_level,
      status: updatedProduct.status
    };

    res.json({
      message: 'Product updated successfully',
      data: responseProduct
    });

  } catch (error) {
    console.error('Update product error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Product with this barcode already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
});

// Delete product (Manager+ only)
router.delete('/:id', [verifyToken, requireManager], async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findByIdAndUpdate(
      id,
      { status: 'inactive' },
      { new: true }
    );

    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      message: 'Product deleted successfully',
      data: { id: deletedProduct._id.toString() }
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;
