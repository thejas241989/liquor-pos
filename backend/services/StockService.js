const Product = require('../models/Product');
const StockAudit = require('../models/StockAudit');
const StockMovement = require('../models/StockMovement');
const DailyStock = require('../models/DailyStock');

class StockService {
  /**
   * Update stock for a sale
   * @param {Array} saleItems - Array of sale items
   * @param {string} saleId - Sale ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result of stock update
   */
  static async updateStockForSale(saleItems, saleId, userId) {
    const results = [];
    const errors = [];

    for (const item of saleItems) {
      try {
        const product = await Product.findById(item.product_id);
        if (!product) {
          errors.push(`Product not found: ${item.product_id}`);
          continue;
        }

        // Check if sufficient stock is available
        if (product.current_stock < item.quantity) {
          errors.push(`Insufficient stock for ${product.name}. Available: ${product.current_stock}, Required: ${item.quantity}`);
          continue;
        }

        // Update product stock
        await product.updateStock(item.quantity, 'sale', userId);

        // Create stock movement record
        await StockMovement.createMovement({
          product_id: item.product_id,
          movement_type: 'out',
          movement_category: 'sale',
          quantity: item.quantity,
          unit_cost: product.cost_price || 0,
          reference_id: saleId,
          reference_type: 'sale',
          reference_number: `SALE-${saleId}`,
          date: new Date(),
          created_by: userId,
          notes: `Sale of ${item.quantity} units`,
          metadata: {
            sale_item_id: item._id,
            unit_price: item.unit_price,
            line_total: item.line_total
          }
        });

        // Update daily stock
        const today = new Date();
        const dailyStock = await DailyStock.getOrCreateDailyStock(item.product_id, today, userId);
        dailyStock.sold_quantity += item.quantity;
        await dailyStock.save();

        results.push({
          product_id: item.product_id,
          product_name: product.name,
          quantity_sold: item.quantity,
          remaining_stock: product.current_stock,
          success: true
        });

      } catch (error) {
        errors.push(`Error updating stock for product ${item.product_id}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors
    };
  }

  /**
   * Add stock for inward/restock
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to add
   * @param {string} referenceId - Reference ID (stock inward ID)
   * @param {string} userId - User ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result of stock addition
   */
  static async addStock(productId, quantity, referenceId, userId, options = {}) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Add stock to product
      await product.addStock(quantity, 'inward', userId);

      // Create stock movement record
      await StockMovement.createMovement({
        product_id: productId,
        movement_type: 'in',
        movement_category: 'stock_inward',
        quantity: quantity,
        unit_cost: options.unit_cost || product.cost_price || 0,
        reference_id: referenceId,
        reference_type: 'stock_inward',
        reference_number: options.reference_number || `INWARD-${referenceId}`,
        date: new Date(),
        created_by: userId,
        notes: options.notes || `Stock inward of ${quantity} units`,
        metadata: options.metadata || {}
      });

      // Update daily stock
      const today = new Date();
      const dailyStock = await DailyStock.getOrCreateDailyStock(productId, today, userId);
      dailyStock.stock_inward += quantity;
      await dailyStock.save();

      return {
        success: true,
        product_id: productId,
        product_name: product.name,
        quantity_added: quantity,
        new_stock: product.current_stock
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Adjust stock manually
   * @param {string} productId - Product ID
   * @param {number} newStock - New stock level
   * @param {string} userId - User ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result of stock adjustment
   */
  static async adjustStock(productId, newStock, userId, options = {}) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const oldStock = product.current_stock;
      const quantityChanged = newStock - oldStock;

      // Set new stock level
      await product.setStock(newStock, 'adjustment', userId);

      // Create stock movement record
      await StockMovement.createMovement({
        product_id: productId,
        movement_type: quantityChanged > 0 ? 'in' : 'out',
        movement_category: 'stock_adjustment',
        quantity: Math.abs(quantityChanged),
        unit_cost: product.cost_price || 0,
        reference_id: options.reference_id || new mongoose.Types.ObjectId(),
        reference_type: 'manual_adjustment',
        reference_number: options.reference_number || `ADJ-${Date.now()}`,
        date: new Date(),
        created_by: userId,
        notes: options.notes || `Manual stock adjustment from ${oldStock} to ${newStock}`,
        metadata: {
          old_stock: oldStock,
          new_stock: newStock,
          adjustment_reason: options.reason || 'Manual adjustment'
        }
      });

      return {
        success: true,
        product_id: productId,
        product_name: product.name,
        old_stock: oldStock,
        new_stock: newStock,
        quantity_changed: quantityChanged
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current stock for all products
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of products with current stock
   */
  static async getCurrentStock(filters = {}) {
    const query = { status: 'active' };
    
    if (filters.category_id) {
      query.category_id = filters.category_id;
    }
    
    if (filters.low_stock) {
      query.current_stock = { $lte: filters.low_stock_threshold || 10 };
    }

    const products = await Product.find(query)
      .populate('category_id', 'name')
      .select('name category_id current_stock stock_quantity min_stock_level cost_price last_stock_update')
      .sort({ name: 1 });

    return products.map(product => ({
      product_id: product._id,
      product_name: product.name,
      category_name: product.category_id?.name || 'Unknown',
      current_stock: product.current_stock,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      cost_price: product.cost_price,
      stock_value: product.current_stock * (product.cost_price || 0),
      last_stock_update: product.last_stock_update,
      is_low_stock: product.current_stock <= product.min_stock_level
    }));
  }

  /**
   * Get stock summary
   * @returns {Promise<Object>} - Stock summary
   */
  static async getStockSummary() {
    const pipeline = [
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: null,
          total_products: { $sum: 1 },
          total_stock: { $sum: '$current_stock' },
          total_stock_value: { $sum: { $multiply: ['$current_stock', { $ifNull: ['$cost_price', 0] }] } },
          low_stock_products: {
            $sum: {
              $cond: [
                { $lte: ['$current_stock', '$min_stock_level'] },
                1,
                0
              ]
            }
          },
          zero_stock_products: {
            $sum: {
              $cond: [
                { $eq: ['$current_stock', 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ];

    const result = await Product.aggregate(pipeline);
    const summary = result[0] || {
      total_products: 0,
      total_stock: 0,
      total_stock_value: 0,
      low_stock_products: 0,
      zero_stock_products: 0
    };

    return {
      ...summary,
      average_stock_per_product: summary.total_products > 0 ? summary.total_stock / summary.total_products : 0,
      stock_health_percentage: summary.total_products > 0 ? 
        ((summary.total_products - summary.low_stock_products) / summary.total_products) * 100 : 0
    };
  }

  /**
   * Validate stock availability for sale
   * @param {Array} saleItems - Array of sale items
   * @returns {Promise<Object>} - Validation result
   */
  static async validateStockAvailability(saleItems) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    for (const item of saleItems) {
      const product = await Product.findById(item.product_id);
      if (!product) {
        validation.valid = false;
        validation.errors.push(`Product not found: ${item.product_id}`);
        continue;
      }

      if (product.current_stock < item.quantity) {
        validation.valid = false;
        validation.errors.push(`Insufficient stock for ${product.name}. Available: ${product.current_stock}, Required: ${item.quantity}`);
      }

      if (product.current_stock <= product.min_stock_level) {
        validation.warnings.push(`${product.name} is at or below minimum stock level (${product.min_stock_level})`);
      }
    }

    return validation;
  }

  /**
   * Get stock movement history for a product
   * @param {string} productId - Product ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} limit - Limit results
   * @returns {Promise<Array>} - Stock movement history
   */
  static async getStockMovementHistory(productId, startDate = null, endDate = null, limit = 100) {
    return await StockMovement.getProductMovements(productId, startDate, endDate, limit);
  }

  /**
   * Get stock audit trail for a product
   * @param {string} productId - Product ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} limit - Limit results
   * @returns {Promise<Array>} - Stock audit trail
   */
  static async getStockAuditTrail(productId, startDate = null, endDate = null, limit = 100) {
    return await StockAudit.getProductAuditTrail(productId, startDate, endDate, limit);
  }
}

module.exports = StockService;
