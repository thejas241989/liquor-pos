const StockReconciliation = require('../models/StockReconciliation');
const Product = require('../models/Product');
const DailyStock = require('../models/DailyStock');
const StockService = require('./StockService');
const StockMovement = require('../models/StockMovement');
const StockAudit = require('../models/StockAudit');

class ReconciliationService {
  /**
   * Create a new stock reconciliation
   * @param {Date} date - Date for reconciliation
   * @param {string} userId - User ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result of reconciliation creation
   */
  static async createReconciliation(date, userId, options = {}) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      // Check if reconciliation already exists for this date
      const existingReconciliation = await StockReconciliation.findOne({
        date: startOfDay,
        status: { $in: ['in_progress', 'pending_approval'] }
      });

      if (existingReconciliation) {
        return {
          success: false,
          error: 'Reconciliation already exists for this date',
          reconciliation_id: existingReconciliation._id
        };
      }

      // Get all active products
      const products = await Product.find({ status: 'active' });
      const reconciliationItems = [];

      for (const product of products) {
        // Get current stock from product
        const currentStock = product.current_stock || 0;
        
        // Get daily stock record for the date
        const dailyStock = await DailyStock.findOne({
          product_id: product._id,
          date: startOfDay
        });

        const systemStock = dailyStock ? dailyStock.closing_stock : currentStock;

        reconciliationItems.push({
          product_id: product._id,
          system_stock: systemStock,
          physical_stock: 0, // To be filled by user
          variance: 0,
          variance_value: 0,
          cost_per_unit: product.cost_price || 0,
          reason: '',
          reconciled_at: null
        });
      }

      // Generate unique reconciliation ID
      const reconciliationId = `REC-${startOfDay.getFullYear()}${(startOfDay.getMonth() + 1).toString().padStart(2, '0')}${startOfDay.getDate().toString().padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

      const reconciliation = new StockReconciliation({
        reconciliation_id: reconciliationId,
        date: startOfDay,
        reconciled_by: userId,
        reconciliation_items: reconciliationItems,
        status: 'in_progress',
        notes: options.notes || ''
      });

      await reconciliation.save();

      return {
        success: true,
        reconciliation_id: reconciliation._id,
        reconciliation_number: reconciliationId,
        date: startOfDay,
        total_products: products.length,
        status: 'in_progress'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update physical stock for a product in reconciliation
   * @param {string} reconciliationId - Reconciliation ID
   * @param {string} productId - Product ID
   * @param {number} physicalStock - Physical stock count
   * @param {string} reason - Reason for variance
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result of physical stock update
   */
  static async updatePhysicalStock(reconciliationId, productId, physicalStock, reason, userId) {
    try {
      const reconciliation = await StockReconciliation.findById(reconciliationId);
      if (!reconciliation) {
        return {
          success: false,
          error: 'Reconciliation not found'
        };
      }

      if (reconciliation.status !== 'in_progress') {
        return {
          success: false,
          error: 'Reconciliation is not in progress'
        };
      }

      const item = reconciliation.reconciliation_items.find(item => 
        item.product_id.toString() === productId.toString()
      );

      if (!item) {
        return {
          success: false,
          error: 'Product not found in reconciliation'
        };
      }

      // Update physical stock and calculate variance
      item.physical_stock = physicalStock;
      item.variance = physicalStock - item.system_stock;
      item.variance_value = item.variance * item.cost_per_unit;
      item.reason = reason;
      item.reconciled_at = new Date();

      await reconciliation.save();

      return {
        success: true,
        product_id: productId,
        system_stock: item.system_stock,
        physical_stock: item.physical_stock,
        variance: item.variance,
        variance_value: item.variance_value,
        reason: reason
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Submit reconciliation for approval
   * @param {string} reconciliationId - Reconciliation ID
   * @param {string} userId - User ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result of submission
   */
  static async submitForApproval(reconciliationId, userId, options = {}) {
    try {
      const reconciliation = await StockReconciliation.findById(reconciliationId);
      if (!reconciliation) {
        return {
          success: false,
          error: 'Reconciliation not found'
        };
      }

      if (reconciliation.status !== 'in_progress') {
        return {
          success: false,
          error: 'Reconciliation is not in progress'
        };
      }

      // Check if all items have been reconciled
      const unreconciledItems = reconciliation.reconciliation_items.filter(item => 
        item.physical_stock === 0 && item.system_stock > 0
      );

      if (unreconciledItems.length > 0 && !options.allow_partial) {
        return {
          success: false,
          error: `There are ${unreconciledItems.length} unreconciled items. Please reconcile all items or allow partial submission.`,
          unreconciled_items: unreconciledItems.length
        };
      }

      // Update status to pending approval
      reconciliation.status = 'pending_approval';
      reconciliation.submitted_at = new Date();
      reconciliation.submitted_by = userId;
      reconciliation.submission_notes = options.notes || '';

      await reconciliation.save();

      return {
        success: true,
        reconciliation_id: reconciliationId,
        status: 'pending_approval',
        total_items: reconciliation.reconciliation_items.length,
        reconciled_items: reconciliation.reconciliation_items.filter(item => item.physical_stock > 0).length,
        total_variance_value: reconciliation.total_variance_value
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Approve reconciliation
   * @param {string} reconciliationId - Reconciliation ID
   * @param {string} approverId - Approver user ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result of approval
   */
  static async approveReconciliation(reconciliationId, approverId, options = {}) {
    try {
      const reconciliation = await StockReconciliation.findById(reconciliationId);
      if (!reconciliation) {
        return {
          success: false,
          error: 'Reconciliation not found'
        };
      }

      if (reconciliation.status !== 'pending_approval') {
        return {
          success: false,
          error: 'Reconciliation is not pending approval'
        };
      }

      // Update status to approved
      reconciliation.status = 'approved';
      reconciliation.approved_at = new Date();
      reconciliation.approved_by = approverId;
      reconciliation.approval_notes = options.notes || '';

      await reconciliation.save();

      // Apply stock adjustments if requested
      if (options.apply_adjustments) {
        const adjustments = await this.applyStockAdjustments(reconciliationId, approverId);
        return {
          success: true,
          reconciliation_id: reconciliationId,
          status: 'approved',
          adjustments_applied: adjustments.success,
          adjustments: adjustments.adjustments
        };
      }

      return {
        success: true,
        reconciliation_id: reconciliationId,
        status: 'approved',
        adjustments_applied: false
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Apply stock adjustments from approved reconciliation
   * @param {string} reconciliationId - Reconciliation ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result of adjustments
   */
  static async applyStockAdjustments(reconciliationId, userId) {
    try {
      const reconciliation = await StockReconciliation.findById(reconciliationId);
      if (!reconciliation) {
        return {
          success: false,
          error: 'Reconciliation not found'
        };
      }

      if (reconciliation.status !== 'approved') {
        return {
          success: false,
          error: 'Reconciliation must be approved before applying adjustments'
        };
      }

      const adjustments = [];
      const errors = [];

      for (const item of reconciliation.reconciliation_items) {
        if (item.variance !== 0) {
          try {
            const product = await Product.findById(item.product_id);
            if (!product) {
              errors.push(`Product not found: ${item.product_id}`);
              continue;
            }

            const oldStock = product.current_stock;
            const newStock = item.physical_stock;
            
            // Update product stock
            await product.setStock(newStock, 'reconciliation', userId);

            // Create stock movement record
            await StockMovement.createMovement({
              product_id: item.product_id,
              movement_type: item.variance > 0 ? 'in' : 'out',
              movement_category: 'stock_reconciliation',
              quantity: Math.abs(item.variance),
              unit_cost: item.cost_per_unit,
              reference_id: reconciliationId,
              reference_type: 'stock_reconciliation',
              reference_number: reconciliation.reconciliation_id,
              date: new Date(),
              created_by: userId,
              notes: `Stock reconciliation adjustment: ${item.reason}`,
              metadata: {
                reconciliation_id: reconciliationId,
                system_stock: item.system_stock,
                physical_stock: item.physical_stock,
                variance: item.variance,
                variance_value: item.variance_value
              }
            });

            adjustments.push({
              product_id: item.product_id,
              product_name: product.name,
              old_stock: oldStock,
              new_stock: newStock,
              variance: item.variance,
              variance_value: item.variance_value,
              reason: item.reason
            });

          } catch (error) {
            errors.push(`Error adjusting stock for product ${item.product_id}: ${error.message}`);
          }
        }
      }

      // Update reconciliation status
      reconciliation.status = 'completed';
      reconciliation.completed_at = new Date();
      reconciliation.completed_by = userId;
      await reconciliation.save();

      return {
        success: true,
        reconciliation_id: reconciliationId,
        adjustments_made: adjustments.length,
        adjustments,
        errors
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get reconciliation details
   * @param {string} reconciliationId - Reconciliation ID
   * @returns {Promise<Object>} - Reconciliation details
   */
  static async getReconciliationDetails(reconciliationId) {
    try {
      const reconciliation = await StockReconciliation.findById(reconciliationId)
        .populate('reconciled_by', 'username email')
        .populate('approved_by', 'username email')
        .populate('reconciliation_items.product_id', 'name category_id');

      if (!reconciliation) {
        return {
          success: false,
          error: 'Reconciliation not found'
        };
      }

      // Populate category information
      const Category = require('../models/Category');
      for (const item of reconciliation.reconciliation_items) {
        if (item.product_id && item.product_id.category_id) {
          const category = await Category.findById(item.product_id.category_id);
          if (category) {
            item.product_id.category_name = category.name;
          }
        }
      }

      return {
        success: true,
        reconciliation
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get reconciliation list
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - Reconciliation list
   */
  static async getReconciliationList(filters = {}) {
    try {
      const query = {};
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.start_date && filters.end_date) {
        query.date = {
          $gte: new Date(filters.start_date),
          $lte: new Date(filters.end_date)
        };
      }

      const reconciliations = await StockReconciliation.find(query)
        .populate('reconciled_by', 'username email')
        .populate('approved_by', 'username email')
        .sort({ date: -1 })
        .limit(filters.limit || 50);

      return {
        success: true,
        reconciliations,
        total: reconciliations.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get reconciliation summary
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} - Reconciliation summary
   */
  static async getReconciliationSummary(startDate, endDate) {
    try {
      const pipeline = [
        {
          $match: {
            date: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total_variance_value: { $sum: '$total_variance_value' },
            total_items: { $sum: { $size: '$reconciliation_items' } }
          }
        }
      ];

      const summary = await StockReconciliation.aggregate(pipeline);

      return {
        success: true,
        start_date: startDate,
        end_date: endDate,
        summary
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ReconciliationService;
