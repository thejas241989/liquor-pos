const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockInward = require('../models/StockInward');
const StockReconciliation = require('../models/StockReconciliation');
const { verifyToken, requireManager, requireStockReconciler } = require('../middleware/auth');

const router = express.Router();

// Stock intake endpoint (Manager+ access)
router.post('/stock-intake', [
  verifyToken,
  requireManager,
  body('product_id').isMongoId().withMessage('Valid product ID is required'),
  body('quantity_received').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('supplier_name').optional().trim()
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
      product_id,
      quantity_received,
      cost_price,
      supplier_name,
      supplier_invoice_no,
      batch_number,
      expiry_date,
      notes
    } = req.body;

    // Check if product exists
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Create stock inward record
    const stockInward = new StockInward({
      product_id,
      quantity_received,
      cost_price: cost_price || product.cost_price,
      supplier_name,
      supplier_invoice_no,
      batch_number,
      expiry_date,
      received_by: req.user.id,
      notes
    });

    await stockInward.save();

    // Update product stock quantity
    product.stock_quantity += quantity_received;
    
    // Update cost price if provided
    if (cost_price) {
      product.cost_price = cost_price;
    }

    await product.save();

    res.status(201).json({
      message: 'Stock intake recorded successfully',
      intakeId: stockInward._id
    });

  } catch (error) {
    console.error('Stock intake error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get stock intake history
router.get('/stock-intake', [verifyToken, requireManager], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const intakes = await StockInward.find()
      .populate('product_id', 'name barcode')
      .populate('received_by', 'username')
      .sort({ received_date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await StockInward.countDocuments();

    res.json({
      intakes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Get stock intake error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create stock reconciliation
router.post('/reconciliation', [
  verifyToken,
  requireStockReconciler,
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('items.*.product_id').isInt().withMessage('Valid product ID is required'),
  body('items.*.physical_stock').isInt({ min: 0 }).withMessage('Physical stock must be non-negative')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { items } = req.body;
    
    // Generate reconciliation number
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as count FROM stock_reconciliation WHERE DATE(reconciliation_date) = CURDATE()'
    );
    const dailyCount = countResult[0].count + 1;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const reconciliation_no = `REC${today}${dailyCount.toString().padStart(4, '0')}`;

    const reconciliations = [];

    for (const item of items) {
      // Get current system stock
      const [products] = await db.execute(
        'SELECT stock_quantity, cost_price FROM products WHERE id = ?',
        [item.product_id]
      );

      if (products.length === 0) {
        return res.status(400).json({ 
          message: `Product with ID ${item.product_id} not found` 
        });
      }

      const system_stock = products[0].stock_quantity;
      const discrepancy_value = (item.physical_stock - system_stock) * products[0].cost_price;

      const [result] = await db.execute(`
        INSERT INTO stock_reconciliation 
        (reconciliation_no, product_id, system_stock, physical_stock, discrepancy_value, 
         reason, reconciler_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        reconciliation_no, item.product_id, system_stock, item.physical_stock,
        discrepancy_value, item.reason || '', req.user.id
      ]);

      reconciliations.push({
        id: result.insertId,
        product_id: item.product_id,
        system_stock,
        physical_stock: item.physical_stock,
        discrepancy: item.physical_stock - system_stock
      });
    }

    res.status(201).json({
      message: 'Stock reconciliation created successfully',
      reconciliation_no,
      items: reconciliations
    });

  } catch (error) {
    console.error('Stock reconciliation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get reconciliation history
router.get('/reconciliation', [verifyToken, requireStockReconciler], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [reconciliations] = await db.execute(`
      SELECT 
        sr.*,
        p.name as product_name,
        p.barcode,
        u.username as reconciler_name
      FROM stock_reconciliation sr
      LEFT JOIN products p ON sr.product_id = p.id
      LEFT JOIN users u ON sr.reconciler_id = u.id
      ORDER BY sr.reconciliation_date DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.json({ reconciliations });

  } catch (error) {
    console.error('Get reconciliation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Inventory summary endpoint (for dashboard)
router.get('/summary', [verifyToken], async (req, res) => {
  try {
    // Get total products count
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: 'active' });
    const lowStockItems = await Product.countDocuments({ 
      $expr: { $lte: ['$stock_quantity', '$min_stock_level'] } 
    });

    // Get categories count
    const Category = require('../models/Category');
    const totalCategories = await Category.countDocuments();

    // Get inventory value (retail and cost)
    const inventoryStats = await Product.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          total_inventory_value: { 
            $sum: { $multiply: ['$stock_quantity', '$price'] } 
          },
          total_cost_value: { 
            $sum: { 
              $multiply: [
                '$stock_quantity', 
                { $ifNull: ['$cost_price', { $multiply: ['$price', 0.7] }] }
              ] 
            } 
          }
        }
      }
    ]);

    const summary = {
      total_products: totalProducts,
      active_products: activeProducts,
      total_categories: totalCategories,
      low_stock_items: lowStockItems,
      total_inventory_value: inventoryStats[0]?.total_inventory_value || 0,
      total_cost_value: inventoryStats[0]?.total_cost_value || 0
    };

    res.json({
      message: 'Inventory summary retrieved successfully',
      data: summary
    });

  } catch (error) {
    console.error('Inventory summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
