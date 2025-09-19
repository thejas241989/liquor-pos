const mongoose = require('mongoose');

// Daily Stock Snapshot Schema - Core inventory tracking
const dailyStockSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  opening_stock: {
    type: Number,
    required: true,
    default: 0
    // Removed min: 0 to allow negative stock values (overselling scenario)
  },
  stock_inward: {
    type: Number,
    default: 0,
    min: 0
  },
  sold_quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  closing_stock: {
    type: Number,
    default: 0
    // Removed min: 0 to allow negative stock values (overselling scenario)
  },
  // Calculated fields for reporting
  stock_value: {
    type: Number,
    default: 0
    // Removed min: 0 to allow negative stock values (overselling scenario)
  },
  cost_per_unit: {
    type: Number,
    default: 0,
    min: 0
  },
  // Reconciliation data
  physical_stock: {
    type: Number,
    default: null,
    min: 0
  },
  stock_variance: {
    type: Number,
    default: 0
  },
  reconciliation_date: {
    type: Date,
    default: null
  },
  reconciled_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Audit fields
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    maxLength: 500
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound indexes for efficient queries
dailyStockSchema.index({ product_id: 1, date: 1 }, { unique: true });
dailyStockSchema.index({ date: 1, product_id: 1 });
dailyStockSchema.index({ reconciliation_date: 1 });
dailyStockSchema.index({ created_by: 1, date: 1 });

// Pre-save middleware to calculate closing stock and stock value
dailyStockSchema.pre('save', function(next) {
  // Calculate closing stock: Opening + Inward - Sold
  this.closing_stock = this.opening_stock + this.stock_inward - this.sold_quantity;
  
  // Calculate stock variance if physical stock is recorded
  if (this.physical_stock !== null && this.physical_stock !== undefined) {
    this.stock_variance = this.physical_stock - this.closing_stock;
  }
  
  // Calculate stock value
  this.stock_value = this.closing_stock * this.cost_per_unit;
  
  next();
});

// Static method to get or create daily stock record
dailyStockSchema.statics.getOrCreateDailyStock = async function(productId, date, userId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  let dailyStock = await this.findOne({
    product_id: productId,
    date: startOfDay
  });
  
  if (!dailyStock) {
    // Get previous day's closing stock as opening stock
    const previousDay = new Date(startOfDay);
    previousDay.setDate(previousDay.getDate() - 1);
    
    const previousStock = await this.findOne({
      product_id: productId,
      date: previousDay
    }).sort({ date: -1 });
    
    const openingStock = previousStock ? previousStock.closing_stock : 0;
    
    // Get product cost price
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    const costPerUnit = product ? (product.cost_price || 0) : 0;
    
    dailyStock = new this({
      product_id: productId,
      date: startOfDay,
      opening_stock: openingStock,
      cost_per_unit: costPerUnit,
      created_by: userId
    });
    
    await dailyStock.save();
  }
  
  return dailyStock;
};

// Static method to create daily stock snapshots for all products
dailyStockSchema.statics.createDailyStockSnapshots = async function(date, userId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const Product = mongoose.model('Product');
  const products = await Product.find({ status: 'active' });
  
  const snapshots = [];
  
  for (const product of products) {
    // Check if snapshot already exists
    const existingSnapshot = await this.findOne({
      product_id: product._id,
      date: startOfDay
    });
    
    if (!existingSnapshot) {
      // Get previous day's closing stock as opening stock
      const previousDay = new Date(startOfDay);
      previousDay.setDate(previousDay.getDate() - 1);
      
      const previousStock = await this.findOne({
        product_id: product._id,
        date: previousDay
      }).sort({ date: -1 });
      
      const openingStock = previousStock ? previousStock.closing_stock : product.current_stock || 0;
      
      const dailyStock = new this({
        product_id: product._id,
        date: startOfDay,
        opening_stock: openingStock,
        cost_per_unit: product.cost_price || 0,
        created_by: userId
      });
      
      await dailyStock.save();
      snapshots.push(dailyStock);
    }
  }
  
  return snapshots;
};

// Static method to update opening stock from previous day's closing stock
dailyStockSchema.statics.updateOpeningStockFromPreviousDay = async function(date, userId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const previousDay = new Date(startOfDay);
  previousDay.setDate(previousDay.getDate() - 1);
  
  // Get all daily stock records for the date
  const dailyStocks = await this.find({ date: startOfDay });
  
  const updates = [];
  
  for (const dailyStock of dailyStocks) {
    const previousStock = await this.findOne({
      product_id: dailyStock.product_id,
      date: previousDay
    }).sort({ date: -1 });
    
    if (previousStock && dailyStock.opening_stock !== previousStock.closing_stock) {
      dailyStock.opening_stock = previousStock.closing_stock;
      await dailyStock.save();
      updates.push({
        product_id: dailyStock.product_id,
        old_opening_stock: dailyStock.opening_stock,
        new_opening_stock: previousStock.closing_stock
      });
    }
  }
  
  return updates;
};

// Static method to sync current stock with daily snapshot
dailyStockSchema.statics.syncCurrentStockWithDailySnapshot = async function(date, userId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const Product = mongoose.model('Product');
  const dailyStocks = await this.find({ date: startOfDay });
  
  const syncs = [];
  
  for (const dailyStock of dailyStocks) {
    const product = await Product.findById(dailyStock.product_id);
    
    if (product && product.current_stock !== dailyStock.closing_stock) {
      const oldStock = product.current_stock;
      product.current_stock = dailyStock.closing_stock;
      product.last_stock_update = new Date();
      await product.save();
      
      syncs.push({
        product_id: product._id,
        old_current_stock: oldStock,
        new_current_stock: dailyStock.closing_stock
      });
    }
  }
  
  return syncs;
};

// Static method to update sold quantity from sales
dailyStockSchema.statics.updateSoldQuantity = async function(productId, date, quantitySold, userId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const dailyStock = await this.getOrCreateDailyStock(productId, startOfDay, userId);
  dailyStock.sold_quantity += quantitySold;
  
  return await dailyStock.save();
};

module.exports = mongoose.model('DailyStock', dailyStockSchema);
