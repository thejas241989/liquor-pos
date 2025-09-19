const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  change_type: {
    type: String,
    enum: ['retail_price', 'cost_price', 'both'],
    required: true
  },
  old_retail_price: {
    type: Number,
    default: null
  },
  new_retail_price: {
    type: Number,
    default: null
  },
  old_cost_price: {
    type: Number,
    default: null
  },
  new_cost_price: {
    type: Number,
    default: null
  },
  retail_price_change: {
    type: Number,
    default: 0
  },
  cost_price_change: {
    type: Number,
    default: 0
  },
  retail_price_change_percentage: {
    type: Number,
    default: 0
  },
  cost_price_change_percentage: {
    type: Number,
    default: 0
  },
  old_profit_margin: {
    type: Number,
    default: null
  },
  new_profit_margin: {
    type: Number,
    default: null
  },
  profit_margin_change: {
    type: Number,
    default: 0
  },
  changed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  change_reason: {
    type: String,
    maxLength: 500,
    default: ''
  },
  change_date: {
    type: Date,
    default: Date.now
  },
  is_bulk_update: {
    type: Boolean,
    default: false
  },
  bulk_update_id: {
    type: String,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for efficient queries
priceHistorySchema.index({ product_id: 1, change_date: -1 });
priceHistorySchema.index({ change_date: -1 });
priceHistorySchema.index({ changed_by: 1, change_date: -1 });
priceHistorySchema.index({ change_type: 1, change_date: -1 });

// Pre-save middleware to calculate changes and percentages
priceHistorySchema.pre('save', function(next) {
  // Calculate retail price change
  if (this.old_retail_price !== null && this.new_retail_price !== null) {
    this.retail_price_change = this.new_retail_price - this.old_retail_price;
    this.retail_price_change_percentage = this.old_retail_price > 0 
      ? (this.retail_price_change / this.old_retail_price) * 100 
      : 0;
  }

  // Calculate cost price change
  if (this.old_cost_price !== null && this.new_cost_price !== null) {
    this.cost_price_change = this.new_cost_price - this.old_cost_price;
    this.cost_price_change_percentage = this.old_cost_price > 0 
      ? (this.cost_price_change / this.old_cost_price) * 100 
      : 0;
  }

  // Calculate profit margins
  if (this.old_retail_price !== null && this.old_cost_price !== null && this.old_cost_price > 0) {
    this.old_profit_margin = ((this.old_retail_price - this.old_cost_price) / this.old_cost_price) * 100;
  }

  if (this.new_retail_price !== null && this.new_cost_price !== null && this.new_cost_price > 0) {
    this.new_profit_margin = ((this.new_retail_price - this.new_cost_price) / this.new_cost_price) * 100;
  }

  // Calculate profit margin change
  if (this.old_profit_margin !== null && this.new_profit_margin !== null) {
    this.profit_margin_change = this.new_profit_margin - this.old_profit_margin;
  }

  next();
});

// Static method to create price history record
priceHistorySchema.statics.createPriceHistory = async function(data) {
  const {
    product_id,
    change_type,
    old_retail_price,
    new_retail_price,
    old_cost_price,
    new_cost_price,
    changed_by,
    change_reason = '',
    is_bulk_update = false,
    bulk_update_id = null
  } = data;

  const priceHistory = new this({
    product_id,
    change_type,
    old_retail_price,
    new_retail_price,
    old_cost_price,
    new_cost_price,
    changed_by,
    change_reason,
    is_bulk_update,
    bulk_update_id
  });

  return await priceHistory.save();
};

// Static method to get price history for a product
priceHistorySchema.statics.getProductPriceHistory = async function(productId, limit = 50) {
  return await this.find({ product_id: productId })
    .populate('changed_by', 'username email')
    .sort({ change_date: -1 })
    .limit(limit);
};

// Static method to get recent price changes across all products
priceHistorySchema.statics.getRecentPriceChanges = async function(limit = 100) {
  return await this.find()
    .populate('product_id', 'name category_id')
    .populate('changed_by', 'username email')
    .sort({ change_date: -1 })
    .limit(limit);
};

// Static method to get price change statistics
priceHistorySchema.statics.getPriceChangeStats = async function(startDate, endDate) {
  const matchStage = {};
  if (startDate && endDate) {
    matchStage.change_date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total_changes: { $sum: 1 },
        retail_price_increases: {
          $sum: { $cond: [{ $gt: ['$retail_price_change', 0] }, 1, 0] }
        },
        retail_price_decreases: {
          $sum: { $cond: [{ $lt: ['$retail_price_change', 0] }, 1, 0] }
        },
        cost_price_increases: {
          $sum: { $cond: [{ $gt: ['$cost_price_change', 0] }, 1, 0] }
        },
        cost_price_decreases: {
          $sum: { $cond: [{ $lt: ['$cost_price_change', 0] }, 1, 0] }
        },
        avg_retail_price_change_percentage: { $avg: '$retail_price_change_percentage' },
        avg_cost_price_change_percentage: { $avg: '$cost_price_change_percentage' },
        avg_profit_margin_change: { $avg: '$profit_margin_change' }
      }
    }
  ]);
};

module.exports = mongoose.model('PriceHistory', priceHistorySchema);
