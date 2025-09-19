const express = require('express');
const { query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const DailyStockService = require('../services/DailyStockService');
const StockService = require('../services/StockService');
const ReconciliationService = require('../services/ReconciliationService');
const { verifyToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// ==================== OPTIMIZED DAY-WISE SALES REPORT ====================

// Day-wise master report - Optimized with new stock system
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

    // Use the new DailyStockService for optimized report generation
    const filters = { category_id };
    
    const report = await DailyStockService.getDailyStockReport(startDate, filters);

    if (report.success) {
      res.json({
        message: 'Day-wise sales report generated successfully',
        data: {
          report_date: date || `${start_date} to ${end_date}`,
          summary: report.summary,
          products: report.products
        }
      });
    } else {
      res.status(400).json({
        message: report.error
      });
    }

  } catch (error) {
    console.error('Day-wise sales report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== STOCK CONTINUITY REPORT ====================

// Stock continuity report
router.get('/stock-continuity', [
  verifyToken,
  query('start_date').isISO8601().withMessage('Valid start date is required'),
  query('end_date').isISO8601().withMessage('Valid end date is required'),
  query('product_id').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { start_date, end_date, product_id } = req.query;

    const report = await DailyStockService.getStockContinuityReport(
      new Date(start_date),
      new Date(end_date),
      product_id
    );

    if (report.success) {
      res.json({
        message: 'Stock continuity report generated successfully',
        data: report
      });
    } else {
      res.status(400).json({
        message: report.error
      });
    }

  } catch (error) {
    console.error('Stock continuity report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== CURRENT STOCK REPORT ====================

// Current stock report
router.get('/current-stock', [
  verifyToken,
  query('category_id').optional().isMongoId(),
  query('low_stock').optional().isBoolean(),
  query('low_stock_threshold').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const filters = {
      category_id: req.query.category_id,
      low_stock: req.query.low_stock === 'true',
      low_stock_threshold: req.query.low_stock_threshold ? parseInt(req.query.low_stock_threshold) : 10
    };

    const currentStock = await StockService.getCurrentStock(filters);
    const summary = await StockService.getStockSummary();

    res.json({
      message: 'Current stock report generated successfully',
      data: {
        filters,
        summary,
        products: currentStock,
        total_products: currentStock.length,
        low_stock_products: currentStock.filter(p => p.is_low_stock).length
      }
    });

  } catch (error) {
    console.error('Current stock report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== STOCK MOVEMENT REPORT ====================

// Stock movement report
router.get('/stock-movements', [
  verifyToken,
  query('start_date').isISO8601().withMessage('Valid start date is required'),
  query('end_date').isISO8601().withMessage('Valid end date is required'),
  query('product_id').optional().isMongoId(),
  query('movement_type').optional().isIn(['in', 'out', 'adjustment', 'transfer', 'reconciliation']),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { start_date, end_date, product_id, movement_type, limit } = req.query;
    const StockMovement = require('../models/StockMovement');

    const query = {
      date: {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      }
    };

    if (product_id) {
      query.product_id = new mongoose.Types.ObjectId(product_id);
    }

    if (movement_type) {
      query.movement_type = movement_type;
    }

    const movements = await StockMovement.find(query)
      .populate('product_id', 'name category_id')
      .populate('created_by', 'username email')
      .sort({ date: -1 })
      .limit(limit ? parseInt(limit) : 100);

    // Get movement summary
    const summary = await StockMovement.getMovementSummary(start_date, end_date);

    res.json({
      message: 'Stock movement report generated successfully',
      data: {
        filters: { start_date, end_date, product_id, movement_type },
        summary,
        movements,
        total_movements: movements.length
      }
    });

  } catch (error) {
    console.error('Stock movement report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== STOCK AUDIT REPORT ====================

// Stock audit report
router.get('/stock-audit', [
  verifyToken,
  query('start_date').isISO8601().withMessage('Valid start date is required'),
  query('end_date').isISO8601().withMessage('Valid end date is required'),
  query('product_id').optional().isMongoId(),
  query('change_type').optional().isIn(['sale', 'inward', 'adjustment', 'reconciliation', 'opening_stock', 'closing_stock', 'manual_adjustment']),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { start_date, end_date, product_id, change_type, limit } = req.query;
    const StockAudit = require('../models/StockAudit');

    const query = {
      timestamp: {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      }
    };

    if (product_id) {
      query.product_id = new mongoose.Types.ObjectId(product_id);
    }

    if (change_type) {
      query.change_type = change_type;
    }

    const auditTrail = await StockAudit.find(query)
      .populate('product_id', 'name category_id')
      .populate('changed_by', 'username email')
      .sort({ timestamp: -1 })
      .limit(limit ? parseInt(limit) : 100);

    // Get audit summary
    const summary = await StockAudit.getAuditSummary(start_date, end_date);

    res.json({
      message: 'Stock audit report generated successfully',
      data: {
        filters: { start_date, end_date, product_id, change_type },
        summary,
        audit_trail: auditTrail,
        total_records: auditTrail.length
      }
    });

  } catch (error) {
    console.error('Stock audit report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== RECONCILIATION REPORT ====================

// Stock reconciliation report
router.get('/reconciliation', [
  verifyToken,
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('status').optional().isIn(['in_progress', 'pending_approval', 'approved', 'completed', 'rejected']),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const filters = {
      status: req.query.status,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };

    const result = await ReconciliationService.getReconciliationList(filters);

    if (result.success) {
      res.json({
        message: 'Stock reconciliation report generated successfully',
        data: {
          reconciliations: result.reconciliations,
          total: result.total,
          filters
        }
      });
    } else {
      res.status(400).json({
        message: result.error
      });
    }

  } catch (error) {
    console.error('Stock reconciliation report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== COMPREHENSIVE STOCK REPORT ====================

// Comprehensive stock report
router.get('/comprehensive', [
  verifyToken,
  query('date').isISO8601().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { date } = req.query;
    const reportDate = new Date(date);

    // Get all data in parallel
    const [
      currentStock,
      stockSummary,
      dailyReport,
      dataValidation
    ] = await Promise.all([
      StockService.getCurrentStock(),
      StockService.getStockSummary(),
      DailyStockService.getDailyStockReport(reportDate),
      DailyStockService.validateDailyStockIntegrity(reportDate)
    ]);

    res.json({
      message: 'Comprehensive stock report generated successfully',
      data: {
        report_date: date,
        current_stock: {
          summary: stockSummary,
          products: currentStock
        },
        daily_snapshot: dailyReport.success ? dailyReport : null,
        data_integrity: dataValidation,
        generated_at: new Date()
      }
    });

  } catch (error) {
    console.error('Comprehensive stock report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== DASHBOARD SUMMARY ====================

// Dashboard summary
router.get('/dashboard-summary', [verifyToken], async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get all data in parallel
    const [
      currentStockSummary,
      todayReport,
      yesterdayReport,
      lowStockAlert
    ] = await Promise.all([
      StockService.getStockSummary(),
      DailyStockService.getDailyStockReport(today),
      DailyStockService.getDailyStockReport(yesterday),
      StockService.getCurrentStock({ low_stock: true })
    ]);

    const summary = {
      current_stock: currentStockSummary,
      today_sales: todayReport.success ? todayReport.summary : null,
      yesterday_sales: yesterdayReport.success ? yesterdayReport.summary : null,
      low_stock_alerts: lowStockAlert.filter(p => p.is_low_stock),
      stock_health: {
        total_products: currentStockSummary.total_products,
        healthy_products: currentStockSummary.total_products - currentStockSummary.low_stock_products,
        health_percentage: currentStockSummary.stock_health_percentage
      }
    };

    res.json({
      message: 'Dashboard summary generated successfully',
      data: summary
    });

  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
