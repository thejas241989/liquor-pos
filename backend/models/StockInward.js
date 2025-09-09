const mongoose = require('mongoose');

// Stock Inward Transaction Schema - Track all stock additions
const stockInwardSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  cost_per_unit: {
    type: Number,
    required: true,
    min: 0
  },
  total_cost: {
    type: Number,
    default: 0,
    min: 0
  },
  supplier_name: {
    type: String,
    maxLength: 200
  },
  invoice_number: {
    type: String,
    maxLength: 100
  },
  batch_number: {
    type: String,
    maxLength: 100
  },
  expiry_date: {
    type: Date
  },
  notes: {
    type: String,
    maxLength: 500
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for efficient queries
stockInwardSchema.index({ product_id: 1, date: 1 });
stockInwardSchema.index({ date: 1 });
stockInwardSchema.index({ status: 1, date: 1 });
stockInwardSchema.index({ created_by: 1, date: 1 });

// Pre-save middleware to calculate total cost
stockInwardSchema.pre('save', function(next) {
  this.total_cost = this.quantity * this.cost_per_unit;
  next();
});

// Post-save middleware to update daily stock
stockInwardSchema.post('save', async function() {
  if (this.status === 'approved') {
    const DailyStock = mongoose.model('DailyStock');
    
    // Update daily stock with this inward quantity
    const startOfDay = new Date(this.date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const dailyStock = await DailyStock.getOrCreateDailyStock(
      this.product_id, 
      startOfDay, 
      this.created_by
    );
    
    dailyStock.stock_inward += this.quantity;
    await dailyStock.save();
  }
});

module.exports = mongoose.model('StockInward', stockInwardSchema);
