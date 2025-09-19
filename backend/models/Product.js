const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxLength: 200
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    maxLength: 100
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  cost_price: {
    type: Number,
    default: null,
    min: 0
  },
  stock_quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  current_stock: {
    type: Number,
    default: 0,
    min: 0
  },
  last_stock_update: {
    type: Date,
    default: Date.now
  },
  min_stock_level: {
    type: Number,
    default: 0,
    min: 0
  },
  brand: {
    type: String,
    maxLength: 100
  },
  volume: {
    type: String,
    maxLength: 50
  },
  alcohol_percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  description: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Create non-unique indexes only
productSchema.index({ name: 1 });
productSchema.index({ category_id: 1 });
productSchema.index({ status: 1 });
productSchema.index({ stock_quantity: 1 });
productSchema.index({ current_stock: 1 });
productSchema.index({ last_stock_update: 1 });

// Pre-save middleware to track price changes
productSchema.pre('save', async function(next) {
  // Only track changes if this is an update (not a new document)
  if (!this.isNew && this.isModified()) {
    const PriceHistory = mongoose.model('PriceHistory');
    
    // Get the original document from the database
    const originalDoc = await this.constructor.findById(this._id);
    
    if (originalDoc) {
      const changes = {
        product_id: this._id,
        changed_by: this._doc?.changed_by || new mongoose.Types.ObjectId(), // Default user if not provided
        change_reason: this._doc?.change_reason || 'Price updated',
        is_bulk_update: this._doc?.is_bulk_update || false,
        bulk_update_id: this._doc?.bulk_update_id || null
      };

      // Check for retail price changes
      if (this.isModified('price') || this.isModified('unit_price')) {
        const oldPrice = originalDoc.price || originalDoc.unit_price;
        const newPrice = this.price || this.unit_price;
        
        if (oldPrice !== newPrice) {
          changes.old_retail_price = oldPrice;
          changes.new_retail_price = newPrice;
          changes.change_type = changes.change_type ? 'both' : 'retail_price';
        }
      }

      // Check for cost price changes
      if (this.isModified('cost_price')) {
        const oldCostPrice = originalDoc.cost_price;
        const newCostPrice = this.cost_price;
        
        if (oldCostPrice !== newCostPrice) {
          changes.old_cost_price = oldCostPrice;
          changes.new_cost_price = newCostPrice;
          changes.change_type = changes.change_type ? 'both' : 'cost_price';
        }
      }

      // Create price history record if there are price changes
      if (changes.change_type) {
        try {
          await PriceHistory.createPriceHistory(changes);
        } catch (error) {
          console.error('Error creating price history:', error);
          // Don't fail the save operation if price history creation fails
        }
      }
    }
  }
  
  next();
});

// Instance methods for stock management
productSchema.methods.updateStock = function(quantity, changeType = 'sale', userId = null) {
  const oldStock = this.current_stock;
  this.current_stock = Math.max(0, this.current_stock - quantity);
  this.last_stock_update = new Date();
  
  // Log stock change for audit trail
  if (userId) {
    const StockAudit = mongoose.model('StockAudit');
    StockAudit.create({
      product_id: this._id,
      change_type: changeType,
      old_value: oldStock,
      new_value: this.current_stock,
      quantity_changed: quantity,
      changed_by: userId,
      timestamp: new Date()
    }).catch(err => console.error('Stock audit logging failed:', err));
  }
  
  return this.save();
};

productSchema.methods.addStock = function(quantity, changeType = 'inward', userId = null) {
  const oldStock = this.current_stock;
  this.current_stock += quantity;
  this.last_stock_update = new Date();
  
  // Log stock change for audit trail
  if (userId) {
    const StockAudit = mongoose.model('StockAudit');
    StockAudit.create({
      product_id: this._id,
      change_type: changeType,
      old_value: oldStock,
      new_value: this.current_stock,
      quantity_changed: quantity,
      changed_by: userId,
      timestamp: new Date()
    }).catch(err => console.error('Stock audit logging failed:', err));
  }
  
  return this.save();
};

productSchema.methods.setStock = function(newStock, changeType = 'adjustment', userId = null) {
  const oldStock = this.current_stock;
  this.current_stock = Math.max(0, newStock);
  this.last_stock_update = new Date();
  
  // Log stock change for audit trail
  if (userId) {
    const StockAudit = mongoose.model('StockAudit');
    StockAudit.create({
      product_id: this._id,
      change_type: changeType,
      old_value: oldStock,
      new_value: this.current_stock,
      quantity_changed: this.current_stock - oldStock,
      changed_by: userId,
      timestamp: new Date()
    }).catch(err => console.error('Stock audit logging failed:', err));
  }
  
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);
