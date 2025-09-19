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
