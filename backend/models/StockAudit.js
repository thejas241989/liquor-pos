const mongoose = require('mongoose');

// Stock Audit Trail Schema - For compliance and tracking all stock changes
const stockAuditSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  change_type: {
    type: String,
    required: true,
    enum: ['sale', 'inward', 'adjustment', 'reconciliation', 'opening_stock', 'closing_stock', 'manual_adjustment'],
    index: true
  },
  old_value: {
    type: Number,
    required: true
  },
  new_value: {
    type: Number,
    required: true
  },
  quantity_changed: {
    type: Number,
    required: true
  },
  changed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  reference_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  reference_type: {
    type: String,
    enum: ['sale', 'stock_inward', 'stock_reconciliation', 'daily_stock', 'manual'],
    default: null
  },
  reason: {
    type: String,
    maxLength: 500
  },
  notes: {
    type: String,
    maxLength: 1000
  },
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound indexes for efficient queries
stockAuditSchema.index({ product_id: 1, timestamp: -1 });
stockAuditSchema.index({ change_type: 1, timestamp: -1 });
stockAuditSchema.index({ changed_by: 1, timestamp: -1 });
stockAuditSchema.index({ reference_id: 1, reference_type: 1 });

// Static methods for audit trail management
stockAuditSchema.statics.logStockChange = async function(data) {
  const {
    product_id,
    change_type,
    old_value,
    new_value,
    quantity_changed,
    changed_by,
    reference_id = null,
    reference_type = null,
    reason = null,
    notes = null,
    metadata = {}
  } = data;

  return await this.create({
    product_id,
    change_type,
    old_value,
    new_value,
    quantity_changed,
    changed_by,
    reference_id,
    reference_type,
    reason,
    notes,
    metadata
  });
};

// Get audit trail for a product
stockAuditSchema.statics.getProductAuditTrail = async function(productId, startDate = null, endDate = null, limit = 100) {
  const query = { product_id: productId };
  
  if (startDate && endDate) {
    query.timestamp = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return await this.find(query)
    .populate('changed_by', 'username email')
    .populate('product_id', 'name')
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Get audit trail for a user
stockAuditSchema.statics.getUserAuditTrail = async function(userId, startDate = null, endDate = null, limit = 100) {
  const query = { changed_by: userId };
  
  if (startDate && endDate) {
    query.timestamp = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return await this.find(query)
    .populate('changed_by', 'username email')
    .populate('product_id', 'name')
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Get audit summary for reporting
stockAuditSchema.statics.getAuditSummary = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: '$change_type',
        total_changes: { $sum: 1 },
        total_quantity_changed: { $sum: '$quantity_changed' },
        unique_products: { $addToSet: '$product_id' },
        unique_users: { $addToSet: '$changed_by' }
      }
    },
    {
      $project: {
        change_type: '$_id',
        total_changes: 1,
        total_quantity_changed: 1,
        unique_products_count: { $size: '$unique_products' },
        unique_users_count: { $size: '$unique_users' }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

module.exports = mongoose.model('StockAudit', stockAuditSchema);
