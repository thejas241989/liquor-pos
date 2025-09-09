const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const DailyStock = require('../models/DailyStock');
const StockInward = require('../models/StockInward');
const StockReconciliation = require('../models/StockReconciliation');
const Product = require('../models/Product');
const { Sale } = require('../models/Sale');
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
      status: 'approved' // Auto-approve for immediate effect
    });

    await stockInward.save();

    // IMMEDIATELY update Product stock quantity
    product.stock_quantity += parseInt(quantity);
    
    // Update cost price if provided
    if (cost_per_unit) {
      product.cost_price = parseFloat(cost_per_unit);
    }
    
    await product.save();

    // Create or update DailyStock record for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let dailyStock = await DailyStock.findOne({
      product_id: product_id,
      date: today
    });
    
    if (!dailyStock) {
      // Create new DailyStock record
      dailyStock = new DailyStock({
        product_id: product_id,
        date: today,
        opening_stock: product.stock_quantity - parseInt(quantity), // Stock before inward
        stock_inward: parseInt(quantity),
        cost_per_unit: parseFloat(cost_per_unit),
        created_by: req.user._id
      });
    } else {
      // Update existing DailyStock record
      dailyStock.stock_inward += parseInt(quantity);
      if (cost_per_unit) {
        dailyStock.cost_per_unit = parseFloat(cost_per_unit);
      }
    }
    
    await dailyStock.save();

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

// 6. CREATE NEW STOCK RECONCILIATION
router.post('/reconciliation/create', [
  verifyToken,
  requireStockReconciler,
  body('date').isISO8601().withMessage('Valid date is required (YYYY-MM-DD)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { date } = req.body;
    const reconciliationDate = new Date(date);
    reconciliationDate.setHours(0, 0, 0, 0);

    // Check if reconciliation already exists for this date
    const existingReconciliation = await StockReconciliation.findOne({
      date: reconciliationDate,
      status: { $in: ['in_progress', 'completed'] }
    });

    if (existingReconciliation) {
      return res.status(400).json({ 
        message: 'Reconciliation already exists for this date',
        reconciliation_id: existingReconciliation.reconciliation_id
      });
    }

    // Create new reconciliation
    const reconciliation = await StockReconciliation.createReconciliation(reconciliationDate, req.user._id);
    await reconciliation.populate('reconciliation_items.product_id', 'name barcode cost_price');

    res.status(201).json({
      message: 'Stock reconciliation created successfully',
      data: reconciliation
    });

  } catch (error) {
    console.error('Create reconciliation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 7. GET RECONCILIATION RECORDS
router.get('/reconciliation', [
  verifyToken,
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('status').optional().isIn(['in_progress', 'completed', 'approved']),
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
    
    if (status) filter.status = status;

    const reconciliations = await StockReconciliation.find(filter)
      .populate('reconciled_by', 'username')
      .populate('approved_by', 'username')
      .populate('reconciliation_items.product_id', 'name barcode')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await StockReconciliation.countDocuments(filter);

    res.json({
      message: 'Reconciliation records retrieved successfully',
      data: reconciliations,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get reconciliation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 8. DAY-WISE SALES REPORT
router.get('/reports/day-wise-sales', [
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
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    // Get daily stock records for the date
    const pipeline = [
      {
        $match: {
          date: reportDate
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
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      }
    ];

    if (category_id) {
      pipeline.push({
        $match: { 'product.category_id': new mongoose.Types.ObjectId(category_id) }
      });
    }

    // Get sales data for the same date
    const salesPipeline = [
      {
        $match: {
          sale_date: {
            $gte: reportDate,
            $lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $group: {
          _id: '$items.product_id',
          total_sold: { $sum: '$items.quantity' },
          total_sales_amount: { $sum: '$items.line_total' }
        }
      }
    ];

    const [dailyStocks, salesData] = await Promise.all([
      DailyStock.aggregate(pipeline),
      Sale.aggregate(salesPipeline)
    ]);

    // Combine daily stock with sales data
    const salesMap = new Map();
    salesData.forEach(sale => {
      salesMap.set(sale._id.toString(), {
        total_sold: sale.total_sold,
        total_sales_amount: sale.total_sales_amount
      });
    });

    const reportData = dailyStocks.map((stock, index) => {
      const sales = salesMap.get(stock.product_id.toString()) || { total_sold: 0, total_sales_amount: 0 };
      
      return {
        si_no: index + 1,
        product_name: stock.product.name,
        category_name: stock.category.name,
        opening_stock: stock.opening_stock,
        sold_quantity: sales.total_sold,
        closing_stock: stock.closing_stock,
        total_sales_amount: sales.total_sales_amount,
        stock_value: stock.stock_value
      };
    });

    // Calculate summary
    const summary = {
      total_products: reportData.length,
      total_opening_stock: reportData.reduce((sum, item) => sum + item.opening_stock, 0),
      total_sold_quantity: reportData.reduce((sum, item) => sum + item.sold_quantity, 0),
      total_closing_stock: reportData.reduce((sum, item) => sum + item.closing_stock, 0),
      total_sales_amount: reportData.reduce((sum, item) => sum + item.total_sales_amount, 0),
      total_stock_value: reportData.reduce((sum, item) => sum + item.stock_value, 0)
    };

    res.json({
      message: 'Day-wise sales report generated successfully',
      data: {
        report_date: date,
        summary,
        products: reportData
      }
    });

  } catch (error) {
    console.error('Day-wise sales report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 9. INVENTORY REPORT (DAY WISE)
router.get('/reports/inventory', [
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
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    const pipeline = [
      {
        $match: {
          date: reportDate
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
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      }
    ];

    if (category_id) {
      pipeline.push({
        $match: { 'product.category_id': new mongoose.Types.ObjectId(category_id) }
      });
    }

    pipeline.push({
      $project: {
        si_no: { $literal: 1 }, // Will be calculated in application
        product_name: '$product.name',
        category_name: '$category.name',
        opening_stock: 1,
        stock_inward: 1,
        sold_quantity: 1,
        closing_balance: '$closing_stock',
        stock_value: 1,
        cost_per_unit: 1,
        physical_stock: 1,
        stock_variance: 1,
        reconciliation_date: 1
      }
    });

    const inventoryData = await DailyStock.aggregate(pipeline);

    // Add SI numbers
    inventoryData.forEach((item, index) => {
      item.si_no = index + 1;
    });

    // Calculate summary
    const summary = {
      total_products: inventoryData.length,
      total_opening_stock: inventoryData.reduce((sum, item) => sum + item.opening_stock, 0),
      total_stock_inward: inventoryData.reduce((sum, item) => sum + item.stock_inward, 0),
      total_sold_quantity: inventoryData.reduce((sum, item) => sum + item.sold_quantity, 0),
      total_closing_balance: inventoryData.reduce((sum, item) => sum + item.closing_balance, 0),
      total_stock_value: inventoryData.reduce((sum, item) => sum + item.stock_value, 0),
      reconciled_products: inventoryData.filter(item => item.physical_stock !== null).length
    };

    res.json({
      message: 'Inventory report generated successfully',
      data: {
        report_date: date,
        summary,
        products: inventoryData
      }
    });

  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 10. STOCK RECONCILIATION REPORT (DAY WISE)
router.get('/reports/stock-reconciliation', [
  verifyToken,
  query('date').isISO8601().withMessage('Valid date is required (YYYY-MM-DD)'),
  query('reconciliation_id').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { date, reconciliation_id } = req.query;
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    // Find reconciliation record
    const filter = { date: reportDate };
    if (reconciliation_id) {
      filter.reconciliation_id = reconciliation_id;
    }

    const reconciliation = await StockReconciliation.findOne(filter)
      .populate('reconciled_by', 'username')
      .populate('approved_by', 'username')
      .populate('reconciliation_items.product_id', 'name barcode cost_price');

    if (!reconciliation) {
      return res.status(404).json({ 
        message: 'No reconciliation found for the specified date',
        date: date
      });
    }

    // Format reconciliation items
    const reconciliationItems = reconciliation.reconciliation_items.map((item, index) => ({
      si_no: index + 1,
      product_name: item.product_id.name,
      barcode: item.product_id.barcode,
      system_stock: item.system_stock,
      physical_stock: item.physical_stock,
      variance: item.variance,
      variance_value: item.variance_value,
      cost_per_unit: item.cost_per_unit,
      reason: item.reason,
      reconciled_at: item.reconciled_at
    }));

    // Calculate summary
    const summary = {
      reconciliation_id: reconciliation.reconciliation_id,
      reconciliation_date: reconciliation.date,
      status: reconciliation.status,
      total_products: reconciliation.total_products,
      products_reconciled: reconciliation.products_reconciled,
      total_variance: reconciliation.total_variance,
      variance_value: reconciliation.variance_value,
      reconciled_by: reconciliation.reconciled_by.username,
      approved_by: reconciliation.approved_by?.username || null,
      approved_at: reconciliation.approved_at,
      notes: reconciliation.notes
    };

    res.json({
      message: 'Stock reconciliation report generated successfully',
      data: {
        summary,
        items: reconciliationItems
      }
    });

  } catch (error) {
    console.error('Stock reconciliation report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 11. GET DAILY STOCK FOR SPECIFIC PRODUCT
router.get('/daily-stock/:product_id', [
  verifyToken,
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { product_id } = req.params;
    const { date_from, date_to, page = 1, limit = 30 } = req.query;
    const skip = (page - 1) * limit;

    // Verify product exists
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Build filter
    const filter = { product_id: new mongoose.Types.ObjectId(product_id) };
    
    if (date_from || date_to) {
      filter.date = {};
      if (date_from) filter.date.$gte = new Date(date_from);
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
      }
    }

    const dailyStocks = await DailyStock.find(filter)
      .populate('created_by', 'username')
      .populate('reconciled_by', 'username')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DailyStock.countDocuments(filter);

    res.json({
      message: 'Daily stock records retrieved successfully',
      data: {
        product: {
          id: product._id,
          name: product.name,
          barcode: product.barcode
        },
        daily_stocks: dailyStocks,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get daily stock error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 12. BULK STOCK INWARD
router.post('/inward/bulk', [
  verifyToken,
  requireManager,
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('items.*.product_id').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive integer'),
  body('items.*.cost_per_unit').isFloat({ min: 0 }).withMessage('Cost per unit must be positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { items, supplier_name, invoice_number, notes } = req.body;
    const results = [];
    const bulkErrors = [];

    for (const item of items) {
      try {
        // Verify product exists
        const product = await Product.findById(item.product_id);
        if (!product) {
          bulkErrors.push({ product_id: item.product_id, error: 'Product not found' });
          continue;
        }

        // Create stock inward record
        const stockInward = new StockInward({
          product_id: item.product_id,
          date: new Date(),
          quantity: parseInt(item.quantity),
          cost_per_unit: parseFloat(item.cost_per_unit),
          supplier_name: supplier_name || item.supplier_name,
          invoice_number: invoice_number || item.invoice_number,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date ? new Date(item.expiry_date) : null,
          notes: notes || item.notes,
          created_by: req.user._id,
          status: 'approved'
        });

        await stockInward.save();

        // IMMEDIATELY update Product stock quantity
        product.stock_quantity += parseInt(item.quantity);
        
        // Update cost price if provided
        if (item.cost_per_unit) {
          product.cost_price = parseFloat(item.cost_per_unit);
        }
        
        await product.save();

        // Create or update DailyStock record for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let dailyStock = await DailyStock.findOne({
          product_id: item.product_id,
          date: today
        });
        
        if (!dailyStock) {
          // Create new DailyStock record
          dailyStock = new DailyStock({
            product_id: item.product_id,
            date: today,
            opening_stock: product.stock_quantity - parseInt(item.quantity), // Stock before inward
            stock_inward: parseInt(item.quantity),
            cost_per_unit: parseFloat(item.cost_per_unit),
            created_by: req.user._id
          });
        } else {
          // Update existing DailyStock record
          dailyStock.stock_inward += parseInt(item.quantity);
          if (item.cost_per_unit) {
            dailyStock.cost_per_unit = parseFloat(item.cost_per_unit);
          }
        }
        
        await dailyStock.save();
        results.push({
          product_id: item.product_id,
          product_name: product.name,
          quantity: item.quantity,
          cost_per_unit: item.cost_per_unit,
          inward_id: stockInward._id
        });

      } catch (itemError) {
        bulkErrors.push({ 
          product_id: item.product_id, 
          error: itemError.message 
        });
      }
    }

    res.status(201).json({
      message: 'Bulk stock inward processed',
      data: {
        successful: results,
        failed: bulkErrors,
        summary: {
          total_items: items.length,
          successful_count: results.length,
          failed_count: bulkErrors.length
        }
      }
    });

  } catch (error) {
    console.error('Bulk stock inward error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 12. EDIT STOCK INWARD RECORD
router.put('/inward/:inward_id', [
  verifyToken,
  requireManager,
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('cost_per_unit').optional().isFloat({ min: 0 }).withMessage('Cost per unit must be positive'),
  body('supplier_name').optional().trim().isLength({ max: 200 }),
  body('invoice_number').optional().trim().isLength({ max: 100 }),
  body('batch_number').optional().trim().isLength({ max: 100 }),
  body('expiry_date').optional().isISO8601().withMessage('Valid expiry date required'),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { inward_id } = req.params;
    const updateData = req.body;

    // Find the stock inward record
    const stockInward = await StockInward.findById(inward_id);
    if (!stockInward) {
      return res.status(404).json({ message: 'Stock inward record not found' });
    }

    // Get the product
    const product = await Product.findById(stockInward.product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Calculate the difference in quantity
    const oldQuantity = stockInward.quantity;
    const newQuantity = updateData.quantity || oldQuantity;
    const quantityDifference = newQuantity - oldQuantity;

    // Update the stock inward record
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        stockInward[key] = updateData[key];
      }
    });

    // Recalculate total cost
    stockInward.total_cost = stockInward.quantity * stockInward.cost_per_unit;

    await stockInward.save();

    // Update product stock quantity based on the difference
    if (quantityDifference !== 0) {
      product.stock_quantity += quantityDifference;
      
      // Ensure stock doesn't go negative
      if (product.stock_quantity < 0) {
        product.stock_quantity = 0;
      }
    }

    // Update cost price if provided
    if (updateData.cost_per_unit) {
      product.cost_price = updateData.cost_per_unit;
    }

    await product.save();

    // Populate for response
    await stockInward.populate('product_id', 'name barcode');
    await stockInward.populate('created_by', 'username');

    res.json({
      message: 'Stock inward record updated successfully',
      data: stockInward,
      stock_impact: {
        quantity_difference: quantityDifference,
        new_product_stock: product.stock_quantity
      }
    });

  } catch (error) {
    console.error('Edit stock inward error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 13. DELETE STOCK INWARD RECORD
router.delete('/inward/:inward_id', [
  verifyToken,
  requireManager
], async (req, res) => {
  try {
    const { inward_id } = req.params;

    // Find the stock inward record
    const stockInward = await StockInward.findById(inward_id);
    if (!stockInward) {
      return res.status(404).json({ message: 'Stock inward record not found' });
    }

    // Get the product
    const product = await Product.findById(stockInward.product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Reduce product stock by the inward quantity
    product.stock_quantity -= stockInward.quantity;
    
    // Ensure stock doesn't go negative
    if (product.stock_quantity < 0) {
      product.stock_quantity = 0;
    }

    await product.save();

    // Delete the stock inward record
    await StockInward.findByIdAndDelete(inward_id);

    res.json({
      message: 'Stock inward record deleted successfully',
      stock_impact: {
        quantity_removed: stockInward.quantity,
        new_product_stock: product.stock_quantity
      }
    });

  } catch (error) {
    console.error('Delete stock inward error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
