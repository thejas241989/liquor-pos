const DailyStock = require('../models/DailyStock');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const StockAudit = require('../models/StockAudit');

class DailyStockService {
  /**
   * Create daily stock snapshots for all active products
   * @param {Date} date - Date for snapshots
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result of snapshot creation
   */
  static async createDailyStockSnapshots(date, userId) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const products = await Product.find({ status: 'active' });
      const snapshots = [];
      const errors = [];

      for (const product of products) {
        try {
          // Check if snapshot already exists
          const existingSnapshot = await DailyStock.findOne({
            product_id: product._id,
            date: startOfDay
          });

          if (!existingSnapshot) {
            // Get previous day's closing stock as opening stock
            const previousDay = new Date(startOfDay);
            previousDay.setDate(previousDay.getDate() - 1);

            const previousStock = await DailyStock.findOne({
              product_id: product._id,
              date: previousDay
            }).sort({ date: -1 });

            const openingStock = previousStock ? previousStock.closing_stock : product.current_stock || 0;

            const dailyStock = new DailyStock({
              product_id: product._id,
              date: startOfDay,
              opening_stock: openingStock,
              cost_per_unit: product.cost_price || 0,
              created_by: userId
            });

            await dailyStock.save();
            snapshots.push({
              product_id: product._id,
              product_name: product.name,
              opening_stock: openingStock,
              created: true
            });
          } else {
            snapshots.push({
              product_id: product._id,
              product_name: product.name,
              opening_stock: existingSnapshot.opening_stock,
              created: false
            });
          }
        } catch (error) {
          errors.push(`Error creating snapshot for product ${product.name}: ${error.message}`);
        }
      }

      return {
        success: true,
        date: startOfDay,
        total_products: products.length,
        snapshots_created: snapshots.filter(s => s.created).length,
        snapshots_existing: snapshots.filter(s => !s.created).length,
        snapshots,
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
   * Update opening stock from previous day's closing stock
   * @param {Date} date - Date to update
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result of opening stock update
   */
  static async updateOpeningStockFromPreviousDay(date, userId) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const previousDay = new Date(startOfDay);
      previousDay.setDate(previousDay.getDate() - 1);

      const dailyStocks = await DailyStock.find({ date: startOfDay });
      const updates = [];
      const errors = [];

      for (const dailyStock of dailyStocks) {
        try {
          const previousStock = await DailyStock.findOne({
            product_id: dailyStock.product_id,
            date: previousDay
          }).sort({ date: -1 });

          if (previousStock && dailyStock.opening_stock !== previousStock.closing_stock) {
            const oldOpeningStock = dailyStock.opening_stock;
            dailyStock.opening_stock = previousStock.closing_stock;
            await dailyStock.save();

            updates.push({
              product_id: dailyStock.product_id,
              old_opening_stock: oldOpeningStock,
              new_opening_stock: previousStock.closing_stock,
              previous_day_closing: previousStock.closing_stock
            });
          }
        } catch (error) {
          errors.push(`Error updating opening stock for product ${dailyStock.product_id}: ${error.message}`);
        }
      }

      return {
        success: true,
        date: startOfDay,
        total_records: dailyStocks.length,
        updates_made: updates.length,
        updates,
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
   * Sync current stock with daily snapshot
   * @param {Date} date - Date to sync
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result of stock sync
   */
  static async syncCurrentStockWithDailySnapshot(date, userId) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const dailyStocks = await DailyStock.find({ date: startOfDay });
      const syncs = [];
      const errors = [];

      for (const dailyStock of dailyStocks) {
        try {
          const product = await Product.findById(dailyStock.product_id);

          if (product && product.current_stock !== dailyStock.closing_stock) {
            const oldStock = product.current_stock;
            product.current_stock = dailyStock.closing_stock;
            product.last_stock_update = new Date();
            await product.save();

            syncs.push({
              product_id: product._id,
              product_name: product.name,
              old_current_stock: oldStock,
              new_current_stock: dailyStock.closing_stock,
              daily_snapshot_closing: dailyStock.closing_stock
            });
          }
        } catch (error) {
          errors.push(`Error syncing stock for product ${dailyStock.product_id}: ${error.message}`);
        }
      }

      return {
        success: true,
        date: startOfDay,
        total_records: dailyStocks.length,
        syncs_made: syncs.length,
        syncs,
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
   * Update sold quantity from sales
   * @param {string} productId - Product ID
   * @param {Date} date - Date of sale
   * @param {number} quantitySold - Quantity sold
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result of sold quantity update
   */
  static async updateSoldQuantity(productId, date, quantitySold, userId) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const dailyStock = await DailyStock.getOrCreateDailyStock(productId, startOfDay, userId);
      const oldSoldQuantity = dailyStock.sold_quantity;
      dailyStock.sold_quantity += quantitySold;
      await dailyStock.save();

      return {
        success: true,
        product_id: productId,
        date: startOfDay,
        old_sold_quantity: oldSoldQuantity,
        new_sold_quantity: dailyStock.sold_quantity,
        quantity_added: quantitySold,
        closing_stock: dailyStock.closing_stock
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update stock inward quantity
   * @param {string} productId - Product ID
   * @param {Date} date - Date of inward
   * @param {number} quantityInward - Quantity inward
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result of inward quantity update
   */
  static async updateStockInward(productId, date, quantityInward, userId) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const dailyStock = await DailyStock.getOrCreateDailyStock(productId, startOfDay, userId);
      const oldInwardQuantity = dailyStock.stock_inward;
      dailyStock.stock_inward += quantityInward;
      await dailyStock.save();

      return {
        success: true,
        product_id: productId,
        date: startOfDay,
        old_inward_quantity: oldInwardQuantity,
        new_inward_quantity: dailyStock.stock_inward,
        quantity_added: quantityInward,
        closing_stock: dailyStock.closing_stock
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get daily stock report for a date
   * @param {Date} date - Date for report
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - Daily stock report
   */
  static async getDailyStockReport(date, filters = {}) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const pipeline = [
        {
          $match: {
            date: startOfDay,
            ...(filters.product_id && { product_id: new mongoose.Types.ObjectId(filters.product_id) })
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
        },
        {
          $project: {
            product_id: 1,
            product_name: '$product.name',
            category_name: '$category.name',
            date: 1,
            opening_stock: 1,
            stock_inward: 1,
            sold_quantity: 1,
            closing_stock: 1,
            stock_value: 1,
            cost_per_unit: 1,
            physical_stock: 1,
            stock_variance: 1
          }
        },
        {
          $sort: { product_name: 1 }
        }
      ];

      if (filters.category_id) {
        pipeline.splice(2, 0, {
          $match: { 'product.category_id': new mongoose.Types.ObjectId(filters.category_id) }
        });
      }

      const dailyStocks = await DailyStock.aggregate(pipeline);

      // Calculate summary
      const summary = {
        total_products: dailyStocks.length,
        total_opening_stock: dailyStocks.reduce((sum, item) => sum + item.opening_stock, 0),
        total_stock_inward: dailyStocks.reduce((sum, item) => sum + item.stock_inward, 0),
        total_sold_quantity: dailyStocks.reduce((sum, item) => sum + item.sold_quantity, 0),
        total_closing_stock: dailyStocks.reduce((sum, item) => sum + item.closing_stock, 0),
        total_stock_value: dailyStocks.reduce((sum, item) => sum + item.stock_value, 0)
      };

      return {
        success: true,
        date: startOfDay,
        summary,
        products: dailyStocks
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get stock continuity report for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} productId - Product ID (optional)
   * @returns {Promise<Object>} - Stock continuity report
   */
  static async getStockContinuityReport(startDate, endDate, productId = null) {
    try {
      const pipeline = [
        {
          $match: {
            date: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            },
            ...(productId && { product_id: new mongoose.Types.ObjectId(productId) })
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
          $sort: { product_id: 1, date: 1 }
        },
        {
          $group: {
            _id: '$product_id',
            product_name: { $first: '$product.name' },
            daily_records: {
              $push: {
                date: '$date',
                opening_stock: '$opening_stock',
                closing_stock: '$closing_stock',
                stock_inward: '$stock_inward',
                sold_quantity: '$sold_quantity'
              }
            }
          }
        }
      ];

      const continuityData = await DailyStock.aggregate(pipeline);

      // Check for continuity issues
      const continuityIssues = [];
      for (const product of continuityData) {
        const records = product.daily_records.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        for (let i = 1; i < records.length; i++) {
          const prevRecord = records[i - 1];
          const currentRecord = records[i];
          
          if (currentRecord.opening_stock !== prevRecord.closing_stock) {
            continuityIssues.push({
              product_id: product._id,
              product_name: product.product_name,
              date: currentRecord.date,
              expected_opening: prevRecord.closing_stock,
              actual_opening: currentRecord.opening_stock,
              variance: currentRecord.opening_stock - prevRecord.closing_stock
            });
          }
        }
      }

      return {
        success: true,
        start_date: startDate,
        end_date: endDate,
        total_products: continuityData.length,
        continuity_issues: continuityIssues.length,
        issues: continuityIssues,
        products: continuityData
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate daily stock data integrity
   * @param {Date} date - Date to validate
   * @returns {Promise<Object>} - Validation result
   */
  static async validateDailyStockIntegrity(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const dailyStocks = await DailyStock.find({ date: startOfDay });
      const validation = {
        valid: true,
        issues: [],
        summary: {
          total_records: dailyStocks.length,
          valid_records: 0,
          invalid_records: 0
        }
      };

      for (const dailyStock of dailyStocks) {
        const issues = [];
        
        // Check if closing stock calculation is correct
        const expectedClosing = dailyStock.opening_stock + dailyStock.stock_inward - dailyStock.sold_quantity;
        if (dailyStock.closing_stock !== expectedClosing) {
          issues.push(`Closing stock mismatch: expected ${expectedClosing}, actual ${dailyStock.closing_stock}`);
        }

        // Check if stock value calculation is correct
        const expectedValue = dailyStock.closing_stock * dailyStock.cost_per_unit;
        if (Math.abs(dailyStock.stock_value - expectedValue) > 0.01) {
          issues.push(`Stock value mismatch: expected ${expectedValue}, actual ${dailyStock.stock_value}`);
        }

        if (issues.length > 0) {
          validation.valid = false;
          validation.issues.push({
            product_id: dailyStock.product_id,
            issues
          });
          validation.summary.invalid_records++;
        } else {
          validation.summary.valid_records++;
        }
      }

      return validation;

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = DailyStockService;
