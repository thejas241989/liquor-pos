const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const DailyStock = require('../models/DailyStock');
const StockInward = require('../models/StockInward');
const StockReconciliation = require('../models/StockReconciliation');
const Product = require('../models/Product');
const { verifyToken, requireManager, requireStockReconciler } = require('../middleware/auth');

const router = express.Router();

// 1. ADD STOCK INWARD
router.post('/inward', [
  verifyToken,
  requireManager,
  body('product_id').isMongoId().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive integer'),
  body('cost_per_unit').isFloat({ min: 0 }).withMessage('Cost per unit must be positive number'),
  body('supplier_name').optional().trim().isLength({ max: 200 }),
  body('invoice_number').optional().trim().isLength({ max: 100 }),
  body('batch_number').optional().trim().isLength({ max: 100 }),
  body('expiry_date').optional().isISO8601(),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const {
      product_id,
      quantity,
      cost_per_unit,
      supplier_name,
      invoice_number,
      batch_number,
      expiry_date,
      notes
    } = req.body;

    // Verify product exists
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Create stock inward record
    const stockInward = new StockInward({
      product_id,
      date: new Date(),
      quantity: parseInt(quantity),
      cost_per_unit: parseFloat(cost_per_unit),
      supplier_name,
      invoice_number,
      batch_number,
      expiry_date: expiry_date ? new Date(expiry_date) : null,
      notes,
      created_by: req.user._id,
      status: 'approved' // Auto-approve for managers
    });

    await stockInward.save();

    // Populate product details for response
    await stockInward.populate('product_id', 'name barcode');
    await stockInward.populate('created_by', 'username');

    res.status(201).json({
      message: 'Stock inward recorded successfully',
      data: stockInward
    });

  } catch (error) {
    console.error('Stock inward error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 2. GET STOCK INWARD RECORDS
router.get('/inward', [
  verifyToken,
  query('date_from').optional().isISO8601().withMessage('Valid from date required'),
  query('date_to').optional().isISO8601().withMessage('Valid to date required'),
  query('product_id').optional().isMongoId().withMessage('Valid product ID required'),
  query('status').optional().isIn(['pending', 'approved', 'rejected']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { 
      date_from, 
      date_to, 
      product_id, 
      status, 
      page = 1, 
      limit = 20 
    } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    
    if (date_from || date_to) {
      filter.date = {};
      if (date_from) filter.date.$gte = new Date(date_from);
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
      }
    }
    
    if (product_id) filter.product_id = product_id;
    if (status) filter.status = status;

    const stockInwardRecords = await StockInward.find(filter)
      .populate('product_id', 'name barcode')
      .populate('created_by', 'username')
      .populate('approved_by', 'username')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await StockInward.countDocuments(filter);

    res.json({
      message: 'Stock inward records retrieved successfully',
      data: stockInwardRecords,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get stock inward error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 3. UPDATE PHYSICAL STOCK (RECONCILIATION)
router.put('/reconciliation/:reconciliation_id/product/:product_id', [
  verifyToken,
  requireStockReconciler,
  body('physical_stock').isInt({ min: 0 }).withMessage('Physical stock must be non-negative integer'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be under 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { reconciliation_id, product_id } = req.params;
    const { physical_stock, reason } = req.body;

    // Find reconciliation record
    const reconciliation = await StockReconciliation.findOne({
      reconciliation_id,
      status: { $in: ['in_progress', 'completed'] }
    });

    if (!reconciliation) {
      return res.status(404).json({ message: 'Reconciliation record not found or already finalized' });
    }

    // Update physical stock for the product
    await reconciliation.updatePhysicalStock(product_id, parseInt(physical_stock), reason || '');

    // Get updated item for response
    const updatedItem = reconciliation.reconciliation_items.find(item => 
      item.product_id.toString() === product_id
    );

    res.json({
      message: 'Physical stock updated successfully',
      data: {
        product_id,
        system_stock: updatedItem.system_stock,
        physical_stock: updatedItem.physical_stock,
        variance: updatedItem.variance,
        variance_value: updatedItem.variance_value,
        reason: updatedItem.reason
      }
    });

  } catch (error) {
    console.error('Update physical stock error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 4. FINALIZE RECONCILIATION
router.put('/reconciliation/:reconciliation_id/finalize', [
  verifyToken,
  requireManager,
  body('notes').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { reconciliation_id } = req.params;
    const { notes } = req.body;

    const reconciliation = await StockReconciliation.findOne({
      reconciliation_id,
      status: { $in: ['in_progress', 'completed'] }
    }).populate('reconciliation_items.product_id', 'name');

    if (!reconciliation) {
      return res.status(404).json({ message: 'Reconciliation record not found or already finalized' });
    }

    // Update reconciliation status
    reconciliation.status = 'approved';
    reconciliation.approved_by = req.user._id;
    reconciliation.approved_at = new Date();
    if (notes) reconciliation.notes = notes;

    // Update daily stock records with physical stock data
    for (const item of reconciliation.reconciliation_items) {
      if (item.physical_stock !== null && item.physical_stock !== undefined) {
        const dailyStock = await DailyStock.findOne({
          product_id: item.product_id._id,
          date: reconciliation.date
        });

        if (dailyStock) {
          dailyStock.physical_stock = item.physical_stock;
          dailyStock.stock_variance = item.variance;
          dailyStock.reconciliation_date = new Date();
          dailyStock.reconciled_by = reconciliation.reconciled_by;
          await dailyStock.save();
        }
      }
    }

    await reconciliation.save();
    await reconciliation.populate('approved_by', 'username');

    res.json({
      message: 'Stock reconciliation finalized successfully',
      data: {
        reconciliation_id: reconciliation.reconciliation_id,
        status: reconciliation.status,
        approved_by: reconciliation.approved_by.username,
        approved_at: reconciliation.approved_at,
        total_variance: reconciliation.total_variance,
        variance_value: reconciliation.variance_value
      }
    });

  } catch (error) {
    console.error('Finalize reconciliation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 5. GET DAILY STOCK SUMMARY
router.get('/daily-summary', [
  verifyToken,
  query('date').isISO8601().withMessage('Valid date is required (YYYY-MM-DD)'),
  query('category_id').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { date, category_id } = req.query;
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const pipeline = [
      {
        $match: {
          date: startOfDay
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'product_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      }
    ];

    if (category_id) {
      pipeline.push({
        $match: { 'product.category_id': new mongoose.Types.ObjectId(category_id) }
      });
    }

    pipeline.push({
      $group: {
        _id: null,
        total_products: { $sum: 1 },
        total_opening_stock: { $sum: '$opening_stock' },
        total_stock_inward: { $sum: '$stock_inward' },
        total_sold_quantity: { $sum: '$sold_quantity' },
        total_closing_stock: { $sum: '$closing_stock' },
        total_stock_value: { $sum: '$stock_value' },
        low_stock_products: {
          $sum: {
            $cond: [
              { $lt: ['$closing_stock', '$product.min_stock_level'] },
              1,
              0
            ]
          }
        }
      }
    });

    const summary = await DailyStock.aggregate(pipeline);

    res.json({
      message: 'Daily stock summary retrieved successfully',
      data: summary[0] || {
        total_products: 0,
        total_opening_stock: 0,
        total_stock_inward: 0,
        total_sold_quantity: 0,
        total_closing_stock: 0,
        total_stock_value: 0,
        low_stock_products: 0
      },
      report_date: date
    });

  } catch (error) {
    console.error('Daily stock summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
