const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const StockService = require('../services/StockService');
const DailyStockService = require('../services/DailyStockService');
const ReconciliationService = require('../services/ReconciliationService');
const { verifyToken } = require('../middleware/auth');

// ==================== REAL-TIME STOCK MANAGEMENT ====================

// Get current stock for all products
router.get('/current-stock', [
  verifyToken,
  query('category_id').optional().isMongoId(),
  query('low_stock').optional().isBoolean(),
  query('low_stock_threshold').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const filters = {
      category_id: req.query.category_id,
      low_stock: req.query.low_stock === 'true',
      low_stock_threshold: req.query.low_stock_threshold ? parseInt(req.query.low_stock_threshold) : 10
    };

    const currentStock = await StockService.getCurrentStock(filters);

    res.json({
      success: true,
      message: 'Current stock retrieved successfully',
      data: {
        filters,
        products: currentStock,
        total_products: currentStock.length,
        low_stock_products: currentStock.filter(p => p.is_low_stock).length
      }
    });

  } catch (error) {
    console.error('Current stock error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get stock summary
router.get('/summary', [verifyToken], async (req, res) => {
  try {
    const summary = await StockService.getStockSummary();

    res.json({
      success: true,
      message: 'Stock summary retrieved successfully',
      data: summary
    });

  } catch (error) {
    console.error('Stock summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Validate stock availability for sale
router.post('/validate-availability', [
  verifyToken,
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.product_id').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { items } = req.body;
    const validation = await StockService.validateStockAvailability(items);

    res.json({
      success: true,
      message: 'Stock availability validated',
      data: validation
    });

  } catch (error) {
    console.error('Stock validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Adjust stock manually
router.post('/adjust', [
  verifyToken,
  body('product_id').isMongoId().withMessage('Valid product ID is required'),
  body('new_stock').isInt({ min: 0 }).withMessage('Valid stock level is required'),
  body('reason').optional().isString().isLength({ max: 500 }),
  body('notes').optional().isString().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { product_id, new_stock, reason, notes } = req.body;
    const userId = req.user.id;

    const result = await StockService.adjustStock(product_id, new_stock, userId, {
      reason,
      notes
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Stock adjusted successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Stock adjustment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get stock movement history
router.get('/movements/:productId', [
  verifyToken,
  param('productId').isMongoId().withMessage('Valid product ID is required'),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { productId } = req.params;
    const { start_date, end_date, limit } = req.query;

    const movements = await StockService.getStockMovementHistory(
      productId,
      start_date,
      end_date,
      limit ? parseInt(limit) : 100
    );

    res.json({
      success: true,
      message: 'Stock movements retrieved successfully',
      data: {
        product_id: productId,
        movements,
        total_movements: movements.length
      }
    });

  } catch (error) {
    console.error('Stock movements error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get stock audit trail
router.get('/audit/:productId', [
  verifyToken,
  param('productId').isMongoId().withMessage('Valid product ID is required'),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { productId } = req.params;
    const { start_date, end_date, limit } = req.query;

    const auditTrail = await StockService.getStockAuditTrail(
      productId,
      start_date,
      end_date,
      limit ? parseInt(limit) : 100
    );

    res.json({
      success: true,
      message: 'Stock audit trail retrieved successfully',
      data: {
        product_id: productId,
        audit_trail: auditTrail,
        total_records: auditTrail.length
      }
    });

  } catch (error) {
    console.error('Stock audit trail error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== DAILY STOCK MANAGEMENT ====================

// Create daily stock snapshots
router.post('/daily-snapshots', [
  verifyToken,
  body('date').optional().isISO8601().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const date = req.body.date ? new Date(req.body.date) : new Date();
    const userId = req.user.id;

    const result = await DailyStockService.createDailyStockSnapshots(date, userId);

    res.json({
      success: true,
      message: 'Daily stock snapshots created successfully',
      data: result
    });

  } catch (error) {
    console.error('Daily snapshots error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get daily stock report
router.get('/daily-report', [
  verifyToken,
  query('date').isISO8601().withMessage('Valid date is required'),
  query('category_id').optional().isMongoId(),
  query('product_id').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { date, category_id, product_id } = req.query;
    const filters = { category_id, product_id };

    const report = await DailyStockService.getDailyStockReport(new Date(date), filters);

    if (report.success) {
      res.json({
        success: true,
        message: 'Daily stock report generated successfully',
        data: report
      });
    } else {
      res.status(400).json({
        success: false,
        message: report.error
      });
    }

  } catch (error) {
    console.error('Daily stock report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get stock continuity report
router.get('/continuity-report', [
  verifyToken,
  query('start_date').isISO8601().withMessage('Valid start date is required'),
  query('end_date').isISO8601().withMessage('Valid end date is required'),
  query('product_id').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { start_date, end_date, product_id } = req.query;

    const report = await DailyStockService.getStockContinuityReport(
      new Date(start_date),
      new Date(end_date),
      product_id
    );

    if (report.success) {
      res.json({
        success: true,
        message: 'Stock continuity report generated successfully',
        data: report
      });
    } else {
      res.status(400).json({
        success: false,
        message: report.error
      });
    }

  } catch (error) {
    console.error('Stock continuity report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Validate daily stock integrity
router.post('/validate-integrity', [
  verifyToken,
  body('date').isISO8601().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { date } = req.body;
    const validation = await DailyStockService.validateDailyStockIntegrity(new Date(date));

    res.json({
      success: true,
      message: 'Daily stock integrity validated',
      data: validation
    });

  } catch (error) {
    console.error('Stock integrity validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== STOCK RECONCILIATION ====================

// Create stock reconciliation
router.post('/reconciliation', [
  verifyToken,
  body('date').isISO8601().withMessage('Valid date is required'),
  body('notes').optional().isString().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { date, notes } = req.body;
    const userId = req.user.id;

    const result = await ReconciliationService.createReconciliation(new Date(date), userId, { notes });

    if (result.success) {
      res.json({
        success: true,
        message: 'Stock reconciliation created successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Reconciliation creation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update physical stock in reconciliation
router.put('/reconciliation/:reconciliationId/physical-stock', [
  verifyToken,
  param('reconciliationId').isMongoId().withMessage('Valid reconciliation ID is required'),
  body('product_id').isMongoId().withMessage('Valid product ID is required'),
  body('physical_stock').isInt({ min: 0 }).withMessage('Valid physical stock is required'),
  body('reason').optional().isString().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { reconciliationId } = req.params;
    const { product_id, physical_stock, reason } = req.body;
    const userId = req.user.id;

    const result = await ReconciliationService.updatePhysicalStock(
      reconciliationId,
      product_id,
      physical_stock,
      reason,
      userId
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Physical stock updated successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Physical stock update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Submit reconciliation for approval
router.post('/reconciliation/:reconciliationId/submit', [
  verifyToken,
  param('reconciliationId').isMongoId().withMessage('Valid reconciliation ID is required'),
  body('notes').optional().isString().isLength({ max: 1000 }),
  body('allow_partial').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { reconciliationId } = req.params;
    const { notes, allow_partial } = req.body;
    const userId = req.user.id;

    const result = await ReconciliationService.submitForApproval(reconciliationId, userId, {
      notes,
      allow_partial
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Reconciliation submitted for approval successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Reconciliation submission error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Approve reconciliation
router.post('/reconciliation/:reconciliationId/approve', [
  verifyToken,
  param('reconciliationId').isMongoId().withMessage('Valid reconciliation ID is required'),
  body('notes').optional().isString().isLength({ max: 1000 }),
  body('apply_adjustments').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { reconciliationId } = req.params;
    const { notes, apply_adjustments } = req.body;
    const approverId = req.user.id;

    const result = await ReconciliationService.approveReconciliation(reconciliationId, approverId, {
      notes,
      apply_adjustments
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Reconciliation approved successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Reconciliation approval error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get reconciliation details
router.get('/reconciliation/:reconciliationId', [
  verifyToken,
  param('reconciliationId').isMongoId().withMessage('Valid reconciliation ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { reconciliationId } = req.params;
    const result = await ReconciliationService.getReconciliationDetails(reconciliationId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Reconciliation details retrieved successfully',
        data: result.reconciliation
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Reconciliation details error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get reconciliation list
router.get('/reconciliation', [
  verifyToken,
  query('status').optional().isIn(['in_progress', 'pending_approval', 'approved', 'completed', 'rejected']),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
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
        success: true,
        message: 'Reconciliation list retrieved successfully',
        data: {
          reconciliations: result.reconciliations,
          total: result.total,
          filters
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Reconciliation list error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get reconciliation summary
router.get('/reconciliation-summary', [
  verifyToken,
  query('start_date').isISO8601().withMessage('Valid start date is required'),
  query('end_date').isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { start_date, end_date } = req.query;
    const result = await ReconciliationService.getReconciliationSummary(
      new Date(start_date),
      new Date(end_date)
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Reconciliation summary retrieved successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Reconciliation summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;