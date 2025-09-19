const express = require('express');
const { query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const DailyStock = require('../models/DailyStock');
const { Sale } = require('../models/Sale');
const Product = require('../models/Product');
const Category = require('../models/Category');
const StockReconciliation = require('../models/StockReconciliation');
const { verifyToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Reports routes are working!', timestamp: new Date() });
});

// Public day-wise master report (no authentication required)
router.get('/public-day-wise-sales', async (req, res) => {
  try {
    const { date, category_id } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required (YYYY-MM-DD)' });
    }

    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    // Get daily stock records for the date
    const dailyStockRecords = await DailyStock.find({
      date: {
        $gte: reportDate,
        $lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('product_id', 'name category_id cost_price selling_price');

    // Get sales for the date
    const startDate = new Date(reportDate);
    const endDate = new Date(reportDate.getTime() + 24 * 60 * 60 * 1000);
    
    const sales = await Sale.find({
      sale_date: {
        $gte: startDate,
        $lt: endDate
      }
    }).populate('items.product_id', 'name category_id');

    // Process the data
    const productMap = new Map();
    
    // Initialize with daily stock data
    dailyStockRecords.forEach(record => {
      const productId = record.product_id._id.toString();
      productMap.set(productId, {
        si_no: productMap.size + 1,
        product_name: record.product_id.name,
        category_name: record.product_id.category_id?.name || 'Unknown',
        opening_stock: record.opening_stock,
        stock_inward: record.stock_inward,
        sold_quantity: 0,
        closing_stock: record.closing_stock,
        total_sales_amount: 0,
        stock_value: record.closing_stock * record.product_id.cost_price
      });
    });

    // Add sales data
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const productId = item.product_id._id.toString();
        if (productMap.has(productId)) {
          const product = productMap.get(productId);
          product.sold_quantity += item.quantity;
          product.total_sales_amount += item.line_total;
        }
      });
    });

    const products = Array.from(productMap.values());
    
    // Calculate summary
    const summary = {
      total_products: products.length,
      total_opening_stock: products.reduce((sum, p) => sum + p.opening_stock, 0),
      total_sold_quantity: products.reduce((sum, p) => sum + p.sold_quantity, 0),
      total_closing_stock: products.reduce((sum, p) => sum + p.closing_stock, 0),
      total_sales_amount: products.reduce((sum, p) => sum + p.total_sales_amount, 0),
      total_stock_value: products.reduce((sum, p) => sum + p.stock_value, 0)
    };

    res.json({
      success: true,
      data: {
        report_date: reportDate.toISOString(),
        summary,
        products
      }
    });
  } catch (error) {
    console.error('Public day-wise master report error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Public daily sales report (no authentication required)
router.get('/public-daily-sales', async (req, res) => {
  try {
    const { date, start_date, end_date } = req.query;
    
    // Determine date range
    let startDate, endDate;
    if (date) {
      startDate = new Date(date);
      endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
    } else if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      // Default to today
      startDate = new Date();
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);
    }

    console.log('Date range:', { startDate, endDate });

    // Get sales data for the date range
    const sales = await Sale.find({
      sale_date: {
        $gte: startDate,
        $lt: endDate
      }
    })
    .populate('items.product_id', 'name category_id')
    .populate('items.product_id.category_id', 'name')
    .populate('biller_id', 'username name');

    console.log('Found sales:', sales.length);

    // Group sales by category and product
    const salesByCategory = {};
    const salesByProduct = {};

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const product = item.product_id;
        const category = product.category_id;
        
        if (!salesByCategory[category._id]) {
          salesByCategory[category._id] = {
            category_id: category._id,
            category_name: category.name,
            total_quantity: 0,
            total_amount: 0,
            products: {}
          };
        }
        
        if (!salesByProduct[product._id]) {
          salesByProduct[product._id] = {
            product_id: product._id,
            product_name: product.name,
            category_id: category._id,
            category_name: category.name,
            total_quantity: 0,
            total_amount: 0
          };
        }
        
        salesByCategory[category._id].total_quantity += item.quantity;
        salesByCategory[category._id].total_amount += item.line_total;
        salesByCategory[category._id].products[product._id] = true;
        
        salesByProduct[product._id].total_quantity += item.quantity;
        salesByProduct[product._id].total_amount += item.line_total;
      });
    });

    const categoryData = Object.values(salesByCategory);
    const productData = Object.values(salesByProduct);

    res.json({
      success: true,
      data: {
        date_range: { startDate, endDate },
        total_sales: sales.length,
        total_amount: sales.reduce((sum, sale) => sum + sale.total_amount, 0),
        categories: categoryData,
        products: productData,
        sales: sales.map(sale => ({
          invoice_no: sale.invoice_no,
          sale_date: sale.sale_date,
          total_amount: sale.total_amount,
          biller: sale.biller_id?.username || 'Unknown',
          items_count: sale.items.length
        }))
      },
      message: 'Daily sales report generated successfully'
    });

  } catch (error) {
    console.error('Error generating daily sales report:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Daily Sales Report
router.get('/daily-sales', [
  verifyToken,
  query('date').optional().isISO8601().withMessage('Date must be a valid date'),
  query('start_date').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('end_date').optional().isISO8601().withMessage('End date must be a valid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { date, start_date, end_date } = req.query;
    
    // Determine date range
    let startDate, endDate;
    if (date) {
      startDate = new Date(date);
      endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
    } else if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      // Default to today
      startDate = new Date();
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);
    }

    // Get sales data for the date range
    const sales = await Sale.find({
      sale_date: {
        $gte: startDate,
        $lt: endDate
      }
    }).populate({
      path: 'items.product_id',
      select: 'name category_id price',
      populate: {
        path: 'category_id',
        select: 'name'
      }
    });

    // Process sales data into category-wise format
    const categoryData = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const product = item.product_id;
        const category = product.category_id;
        const categoryName = category ? category.name : 'Unknown';
        
        if (!categoryData[categoryName]) {
          categoryData[categoryName] = {};
        }
        
        if (!categoryData[categoryName][product.name]) {
          categoryData[categoryName][product.name] = {
            category: categoryName,
            product: product.name,
            unitPrice: product.price,
            quantity: 0,
            totalAmount: 0
          };
        }
        
        categoryData[categoryName][product.name].quantity += item.quantity;
        categoryData[categoryName][product.name].totalAmount += item.line_total || (item.quantity * product.price);
      });
    });

    // Convert to array format
    const rows = [];
    Object.values(categoryData).forEach(categoryProducts => {
      Object.values(categoryProducts).forEach(product => {
        rows.push(product);
      });
    });

    // Sort by category and product name
    rows.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.product.localeCompare(b.product);
    });

    const range = date ? { date: date } : { start_date: start_date, end_date: end_date };

    res.json({
      success: true,
      data: {
        rows,
        range,
        summary: {
          total_quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
          total_amount: rows.reduce((sum, row) => sum + row.totalAmount, 0)
        }
      }
    });

  } catch (error) {
    console.error('Daily sales report error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Top Products Report
router.get('/top-products', [
  verifyToken,
  query('start_date').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('end_date').optional().isISO8601().withMessage('End date must be a valid date'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { start_date, end_date, limit = 10 } = req.query;
    
    // Determine date range (default to last 30 days)
    let startDate, endDate;
    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    // Aggregate sales data to get top products
    const topProducts = await Sale.aggregate([
      {
        $match: {
          sale_date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product_id',
          total_quantity_sold: { $sum: '$items.quantity' },
          total_revenue: { $sum: '$items.line_total' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: '$product.name',
          total_quantity_sold: 1,
          total_revenue: 1
        }
      },
      { $sort: { total_quantity_sold: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: {
        topProducts,
        dateRange: { start_date, end_date },
        summary: {
          total_products: topProducts.length,
          total_quantity: topProducts.reduce((sum, p) => sum + p.total_quantity_sold, 0),
          total_revenue: topProducts.reduce((sum, p) => sum + p.total_revenue, 0)
        }
      }
    });

  } catch (error) {
    console.error('Top products report error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Inventory Summary endpoint (for dashboard)
router.get('/inventory-summary', [verifyToken], async (req, res) => {
  try {
    // Get products and categories count
    const [totalProducts, totalCategories] = await Promise.all([
      Product.countDocuments({ status: { $ne: 'deleted' } }),
      Category.countDocuments({ status: { $ne: 'deleted' } })
    ]);

    // Get inventory summary using aggregation
    const inventorySummary = await Product.aggregate([
      {
        $match: { status: { $ne: 'deleted' } }
      },
      {
        $group: {
          _id: null,
          total_inventory_value: { 
            $sum: { $multiply: ['$stock_quantity', '$price'] }
          },
          total_cost_value: { 
            $sum: { $multiply: ['$stock_quantity', '$cost_price'] }
          },
          low_stock_items: {
            $sum: {
              $cond: [
                { $lte: ['$stock_quantity', '$reorderLevel'] },
                1,
                0
              ]
            }
          },
          out_of_stock_items: {
            $sum: {
              $cond: [
                { $eq: ['$stock_quantity', 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const summary = inventorySummary[0] || {
      total_inventory_value: 0,
      total_cost_value: 0,
      low_stock_items: 0,
      out_of_stock_items: 0
    };

    res.json({
      message: 'Inventory summary retrieved successfully',
      data: {
        total_products: totalProducts,
        total_categories: totalCategories,
        total_inventory_value: summary.total_inventory_value || 0,
        total_cost_value: summary.total_cost_value || 0,
        low_stock_items: summary.low_stock_items || 0,
        out_of_stock_items: summary.out_of_stock_items || 0
      }
    });

  } catch (error) {
    console.error('Inventory summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Inventory Report
router.get('/inventory', [
  verifyToken,
  query('date').optional().isISO8601().withMessage('Date must be a valid date'),
  query('category').optional().isMongoId().withMessage('Category must be a valid ID'),
  query('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { 
      date = new Date().toISOString().split('T')[0], 
      category, 
      lowStockThreshold = 10,
      page = 1, 
      limit = 20 
    } = req.query;
    const skip = (page - 1) * limit;

    const matchStage = {
      date: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
      }
    };

    const pipeline = [
      { $match: matchStage },
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

    // Add category filter if provided
    if (category) {
      pipeline.push({
        $match: { 'category._id': new mongoose.Types.ObjectId(category) }
      });
    }

    pipeline.push(
      {
        $project: {
          _id: 0,
          productId: '$product_id',
          productName: '$product.name',
          categoryName: '$category.name',
          currentStock: '$closing_stock',
          unitPrice: '$product.price',
          totalValue: { $multiply: ['$closing_stock', '$product.price'] },
          reorderLevel: '$product.reorderLevel',
          isLowStock: { $lte: ['$closing_stock', parseInt(lowStockThreshold)] },
          lastUpdated: '$date'
        }
      },
      {
        $sort: { categoryName: 1, productName: 1 }
      },
      {
        $facet: {
          inventory: [
            { $skip: skip },
            { $limit: parseInt(limit) }
          ],
          totalCount: [
            { $count: 'count' }
          ],
          summary: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalStockValue: { $sum: '$totalValue' },
                lowStockItems: { 
                  $sum: { 
                    $cond: [{ $lte: ['$currentStock', parseInt(lowStockThreshold)] }, 1, 0] 
                  } 
                },
                totalQuantity: { $sum: '$currentStock' }
              }
            }
          ]
        }
      }
    );

    console.log('🚀 Running aggregation pipeline with', pipeline.length, 'stages');
    const result = await DailyStock.aggregate(pipeline);
    console.log('📊 Aggregation result structure:', {
      inventory: result[0].inventory.length,
      totalCount: result[0].totalCount[0]?.count || 0,
      summary: result[0].summary[0] || {}
    });
    
    const inventory = result[0].inventory;
    const totalCount = result[0].totalCount[0]?.count || 0;
    const summary = result[0].summary[0] || { 
      totalProducts: 0, 
      totalStockValue: 0, 
      lowStockItems: 0, 
      totalQuantity: 0 
    };

    res.json({
      inventory,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalRecords: totalCount,
        limit: parseInt(limit)
      },
      summary,
      filters: { date, category, lowStockThreshold }
    });

  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Stock Reconciliation Report
router.get('/stock-reconciliation', [
  verifyToken,
  requireManager,
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Status must be pending, approved, or rejected'),
  query('reconcilierId').optional().isMongoId().withMessage('Reconciler ID must be a valid ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      status,
      reconcilierId,
      page = 1, 
      limit = 10 
    } = req.query;
    const skip = (page - 1) * limit;

    const matchStage = {
      reconciliationDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (status) {
      matchStage.status = status;
    }

    if (reconcilierId) {
      matchStage.reconcilerId = new mongoose.Types.ObjectId(reconcilierId);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'reconcilerId',
          foreignField: '_id',
          as: 'reconciler'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'approvedBy',
          foreignField: '_id',
          as: 'approver'
        }
      },
      {
        $unwind: '$reconciler'
      },
      {
        $unwind: { path: '$approver', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
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
          localField: 'product.category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $project: {
          _id: 0,
          reconciliationId: '$_id',
          reconciliationDate: 1,
          status: 1,
          reconcilerName: '$reconciler.name',
          approverName: '$approver.name',
          approvedAt: 1,
          productName: '$product.name',
          categoryName: '$category.name',
          systemStock: '$items.systemStock',
          physicalStock: '$items.physicalStock',
          variance: '$items.variance',
          unitPrice: '$product.price',
          varianceValue: { $multiply: ['$items.variance', '$product.price'] },
          comments: 1
        }
      },
      {
        $sort: { reconciliationDate: -1, productName: 1 }
      },
      {
        $facet: {
          reconciliations: [
            { $skip: skip },
            { $limit: parseInt(limit) }
          ],
          totalCount: [
            { $count: 'count' }
          ],
          summary: [
            {
              $group: {
                _id: null,
                totalReconciliations: { $addToSet: '$reconciliationId' },
                totalVarianceValue: { $sum: '$varianceValue' },
                positiveVariances: { 
                  $sum: { 
                    $cond: [{ $gt: ['$variance', 0] }, '$variance', 0] 
                  } 
                },
                negativeVariances: { 
                  $sum: { 
                    $cond: [{ $lt: ['$variance', 0] }, '$variance', 0] 
                  } 
                }
              }
            },
            {
              $project: {
                totalReconciliations: { $size: '$totalReconciliations' },
                totalVarianceValue: 1,
                positiveVariances: 1,
                negativeVariances: 1
              }
            }
          ]
        }
      }
    ];

    const result = await StockReconciliation.aggregate(pipeline);
    const reconciliations = result[0].reconciliations;
    const totalCount = result[0].totalCount[0]?.count || 0;
    const summary = result[0].summary[0] || { 
      totalReconciliations: 0, 
      totalVarianceValue: 0, 
      positiveVariances: 0, 
      negativeVariances: 0 
    };

    res.json({
      reconciliations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalRecords: totalCount,
        limit: parseInt(limit)
      },
      summary,
      filters: { startDate, endDate, status, reconcilierId }
    });

  } catch (error) {
    console.error('Stock reconciliation report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Current Stock Report (alias for inventory report)
router.get('/current-stock', [
  verifyToken,
  query('date').optional().isISO8601().withMessage('Date must be a valid date'),
  query('category').optional().isMongoId().withMessage('Category must be a valid ID'),
  query('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  // Redirect to inventory report
  req.url = '/inventory' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  return router.handle(req, res);
});

// Monthly Sales Report (alias for daily sales with month range)
router.get('/monthly-sales', [
  verifyToken,
  query('start_date').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('end_date').optional().isISO8601().withMessage('End date must be a valid date')
], async (req, res) => {
  // Redirect to daily sales report
  req.url = '/daily-sales' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  return router.handle(req, res);
});

// Bill-wise Report
router.get('/bill-wise', [
  verifyToken,
  query('date').optional().isISO8601().withMessage('Date must be a valid date (YYYY-MM-DD)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    console.log('🔍 Fetching bill-wise report for date:', reportDate.toISOString());

    // Get all sales for the specified date with populated data
    const bills = await Sale.find({
      sale_date: {
        $gte: reportDate,
        $lt: nextDay
      }
    })
    .populate('biller_id', 'username')
    .populate('items.product_id', 'name barcode')
    .sort({ sale_date: -1 })
    .lean();

    console.log(`📊 Found ${bills.length} bills for ${reportDate.toISOString().split('T')[0]}`);

    // Calculate summary statistics
    const summary = {
      total_bills: bills.length,
      total_amount: bills.reduce((sum, bill) => sum + bill.total_amount, 0),
      total_subtotal: bills.reduce((sum, bill) => sum + bill.subtotal, 0),
      total_discount: bills.reduce((sum, bill) => sum + bill.discount_amount, 0),
      payment_methods: {
        cash: bills.filter(bill => bill.payment_method === 'cash').length,
        upi: bills.filter(bill => bill.payment_method === 'upi').length,
        credit: bills.filter(bill => bill.payment_method === 'credit').length,
        mixed: bills.filter(bill => bill.payment_method === 'mixed').length
      },
      payment_status: {
        paid: bills.filter(bill => bill.payment_status === 'paid').length,
        pending: bills.filter(bill => bill.payment_status === 'pending').length,
        partial: bills.filter(bill => bill.payment_status === 'partial').length
      }
    };

    res.json({
      success: true,
      data: {
        bills,
        summary,
        date: reportDate.toISOString().split('T')[0],
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Bill-wise report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate bill-wise report',
      error: error.message
    });
  }
});

// Biller Performance Report
router.get('/biller-performance', [
  verifyToken,
  query('start_date').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('end_date').optional().isISO8601().withMessage('End date must be a valid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { start_date, end_date } = req.query;
    
    // Determine date range (default to last 30 days)
    let startDate, endDate;
    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    // Aggregate sales data by biller
    const billerPerformance = await Sale.aggregate([
      {
        $match: {
          sale_date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: '$biller_id',
          total_sales: { $sum: 1 },
          total_amount: { $sum: '$total_amount' },
          total_items_sold: { $sum: { $size: '$items' } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'biller'
        }
      },
      { $unwind: '$biller' },
      {
        $project: {
          _id: 0,
          biller_id: '$_id',
          biller_name: '$biller.name',
          total_sales: 1,
          total_amount: 1,
          total_items_sold: 1,
          average_sale_amount: { $divide: ['$total_amount', '$total_sales'] }
        }
      },
      { $sort: { total_amount: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        billerPerformance,
        dateRange: { start_date, end_date },
        summary: {
          total_billers: billerPerformance.length,
          total_sales: billerPerformance.reduce((sum, b) => sum + b.total_sales, 0),
          total_amount: billerPerformance.reduce((sum, b) => sum + b.total_amount, 0)
        }
      }
    });

  } catch (error) {
    console.error('Biller performance report error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Day-wise master report
router.get('/day-wise-sales', [
  verifyToken,
  query('date').optional().isISO8601().withMessage('Date must be a valid date (YYYY-MM-DD)'),
  query('start_date').optional().isISO8601().withMessage('Start date must be a valid date (YYYY-MM-DD)'),
  query('end_date').optional().isISO8601().withMessage('End date must be a valid date (YYYY-MM-DD)'),
  query('category_id').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { date, start_date, end_date, category_id } = req.query;
    
    // Support both single date and date range
    let startDate, endDate;
    
    if (date) {
      // Single date mode
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else if (start_date && end_date) {
      // Date range mode
      startDate = new Date(start_date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      return res.status(400).json({ 
        message: 'Either date (YYYY-MM-DD) or start_date and end_date (YYYY-MM-DD) parameters are required' 
      });
    }

    // Get daily stock records for the date range
    const pipeline = [
      {
        $match: {
          date: {
            $gte: startDate,
            $lt: endDate
          }
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

    // Get sales data for the same date range
    const salesPipeline = [
      {
        $match: {
          sale_date: {
            $gte: startDate,
            $lt: endDate
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

    // Group products by category
    const categoryMap = new Map();
    let globalSiNo = 1;

    dailyStocks.forEach((stock) => {
      const sales = salesMap.get(stock.product_id.toString()) || { total_sold: 0, total_sales_amount: 0 };
      const categoryName = stock.category.name;
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          category_name: categoryName,
          category_summary: {
            total_products: 0,
            total_opening_stock: 0,
            total_stock_inward: 0,
            total_sold_quantity: 0,
            total_closing_stock: 0,
            total_sales_amount: 0,
            total_stock_value: 0
          },
          products: []
        });
      }

      const category = categoryMap.get(categoryName);
      const productData = {
        si_no: globalSiNo++,
        product_name: stock.product.name,
        category_name: categoryName,
        opening_stock: stock.opening_stock,
        stock_inward: stock.stock_inward,
        sold_quantity: sales.total_sold,
        closing_stock: stock.closing_stock,
        total_sales_amount: sales.total_sales_amount,
        stock_value: stock.stock_value
      };

      category.products.push(productData);
      
      // Update category summary
      category.category_summary.total_products++;
      category.category_summary.total_opening_stock += stock.opening_stock;
      category.category_summary.total_stock_inward += stock.stock_inward;
      category.category_summary.total_sold_quantity += sales.total_sold;
      category.category_summary.total_closing_stock += stock.closing_stock;
      category.category_summary.total_sales_amount += sales.total_sales_amount;
      category.category_summary.total_stock_value += stock.stock_value;
    });

    // Convert map to array and sort categories by name
    const categories = Array.from(categoryMap.values()).sort((a, b) => 
      a.category_name.localeCompare(b.category_name)
    );

    // Calculate overall summary
    const summary = {
      total_categories: categories.length,
      total_products: categories.reduce((sum, cat) => sum + cat.category_summary.total_products, 0),
      total_opening_stock: categories.reduce((sum, cat) => sum + cat.category_summary.total_opening_stock, 0),
      total_stock_inward: categories.reduce((sum, cat) => sum + cat.category_summary.total_stock_inward, 0),
      total_sold_quantity: categories.reduce((sum, cat) => sum + cat.category_summary.total_sold_quantity, 0),
      total_closing_stock: categories.reduce((sum, cat) => sum + cat.category_summary.total_closing_stock, 0),
      total_sales_amount: categories.reduce((sum, cat) => sum + cat.category_summary.total_sales_amount, 0),
      total_stock_value: categories.reduce((sum, cat) => sum + cat.category_summary.total_stock_value, 0)
    };

    res.json({
      message: 'Day-wise master report generated successfully',
      data: {
        report_date: date || `${start_date} to ${end_date}`,
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date(endDate.getTime() - 1).toISOString().split('T')[0],
        is_date_range: !date,
        summary,
        categories
      }
    });

  } catch (error) {
    console.error('Day-wise master report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Stock reconciliation report
router.get('/stock-reconciliation', [verifyToken], async (req, res) => {
  try {
    const { date, reconciliation_id } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required (YYYY-MM-DD)' });
    }

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

module.exports = router;
