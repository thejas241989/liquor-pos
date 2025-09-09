const mongoose = require('mongoose');

// Stock Reconciliation Schema - Track physical stock counts and variances
const stockReconciliationSchema = new mongoose.Schema({
  reconciliation_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  reconciled_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'approved'],
    default: 'in_progress',
    index: true
  },
  total_products: {
    type: Number,
    default: 0
  },
  products_reconciled: {
    type: Number,
    default: 0
  },
  total_variance: {
    type: Number,
    default: 0
  },
  variance_value: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    maxLength: 1000
  },
  // Individual product reconciliation details
  reconciliation_items: [{
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    system_stock: {
      type: Number,
      required: true,
      min: 0
    },
    physical_stock: {
      type: Number,
      required: true,
      min: 0
    },
    variance: {
      type: Number,
      required: true
    },
    variance_value: {
      type: Number,
      required: true
    },
    cost_per_unit: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      maxLength: 500
    },
    reconciled_at: {
      type: Date,
      default: Date.now
    }
  }],
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: {
    type: Date
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for efficient queries
stockReconciliationSchema.index({ date: 1, status: 1 });
stockReconciliationSchema.index({ reconciled_by: 1, date: 1 });
stockReconciliationSchema.index({ 'reconciliation_items.product_id': 1 });

// Pre-save middleware to calculate totals
stockReconciliationSchema.pre('save', function(next) {
  this.total_products = this.reconciliation_items.length;
  this.products_reconciled = this.reconciliation_items.filter(item => 
    item.physical_stock !== null && item.physical_stock !== undefined
  ).length;
  
  this.total_variance = this.reconciliation_items.reduce((sum, item) => 
    sum + Math.abs(item.variance), 0
  );
  
  this.variance_value = this.reconciliation_items.reduce((sum, item) => 
    sum + item.variance_value, 0
  );
  
  next();
});

// Static method to create new reconciliation
stockReconciliationSchema.statics.createReconciliation = async function(date, userId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  // Generate unique reconciliation ID
  const reconciliationId = `REC-${startOfDay.getFullYear()}${(startOfDay.getMonth() + 1).toString().padStart(2, '0')}${startOfDay.getDate().toString().padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
  
  // Get all products with their current stock
  const DailyStock = mongoose.model('DailyStock');
  const Product = mongoose.model('Product');
  
  const products = await Product.find({ status: 'active' });
  const reconciliationItems = [];
  
  for (const product of products) {
    const dailyStock = await DailyStock.getOrCreateDailyStock(product._id, startOfDay, userId);
    
    reconciliationItems.push({
      product_id: product._id,
      system_stock: dailyStock.closing_stock,
      physical_stock: 0, // To be filled by user
      variance: 0,
      variance_value: 0,
      cost_per_unit: product.cost_price || 0
    });
  }
  
  const reconciliation = new this({
    reconciliation_id: reconciliationId,
    date: startOfDay,
    reconciled_by: userId,
    reconciliation_items: reconciliationItems
  });
  
  return await reconciliation.save();
};

// Method to update physical stock for a product
stockReconciliationSchema.methods.updatePhysicalStock = function(productId, physicalStock, reason = '') {
  const item = this.reconciliation_items.find(item => 
    item.product_id.toString() === productId.toString()
  );
  
  if (item) {
    item.physical_stock = physicalStock;
    item.variance = physicalStock - item.system_stock;
    item.variance_value = item.variance * item.cost_per_unit;
    item.reason = reason;
    item.reconciled_at = new Date();
  }
  
  return this.save();
};

module.exports = mongoose.model('StockReconciliation', stockReconciliationSchema);
