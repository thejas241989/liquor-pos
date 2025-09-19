const mongoose = require('mongoose');

// Stock Movement Schema - For tracking all stock movements and transactions
const stockMovementSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  movement_type: {
    type: String,
    required: true,
    enum: ['in', 'out', 'adjustment', 'transfer', 'reconciliation'],
    index: true
  },
  movement_category: {
    type: String,
    required: true,
    enum: ['sale', 'stock_inward', 'stock_adjustment', 'stock_transfer', 'stock_reconciliation', 'opening_stock', 'closing_stock'],
    index: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit_cost: {
    type: Number,
    default: 0,
    min: 0
  },
  total_cost: {
    type: Number,
    default: 0,
    min: 0
  },
  reference_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  reference_type: {
    type: String,
    required: true,
    enum: ['sale', 'stock_inward', 'stock_reconciliation', 'daily_stock', 'manual_adjustment'],
    index: true
  },
  reference_number: {
    type: String,
    maxLength: 100
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  notes: {
    type: String,
    maxLength: 500
  },
  // Additional metadata for specific movement types
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Status for tracking movement processing
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed', 'cancelled'],
    default: 'processed',
    index: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound indexes for efficient queries
stockMovementSchema.index({ product_id: 1, date: -1 });
stockMovementSchema.index({ movement_type: 1, date: -1 });
stockMovementSchema.index({ movement_category: 1, date: -1 });
stockMovementSchema.index({ reference_id: 1, reference_type: 1 });
stockMovementSchema.index({ created_by: 1, date: -1 });
stockMovementSchema.index({ status: 1, date: -1 });

// Pre-save middleware to calculate total cost
stockMovementSchema.pre('save', function(next) {
  if (this.quantity && this.unit_cost) {
    this.total_cost = this.quantity * this.unit_cost;
  }
  next();
});

// Static methods for stock movement management
stockMovementSchema.statics.createMovement = async function(data) {
  const {
    product_id,
    movement_type,
    movement_category,
    quantity,
    unit_cost = 0,
    reference_id,
    reference_type,
    reference_number = null,
    date = new Date(),
    created_by,
    notes = null,
    metadata = {}
  } = data;

  return await this.create({
    product_id,
    movement_type,
    movement_category,
    quantity,
    unit_cost,
    reference_id,
    reference_type,
    reference_number,
    date,
    created_by,
    notes,
    metadata
  });
};

// Get movements for a product
stockMovementSchema.statics.getProductMovements = async function(productId, startDate = null, endDate = null, limit = 100) {
  const query = { product_id: productId };
  
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return await this.find(query)
    .populate('product_id', 'name')
    .populate('created_by', 'username email')
    .sort({ date: -1 })
    .limit(limit);
};

// Get movements by type
stockMovementSchema.statics.getMovementsByType = async function(movementType, startDate = null, endDate = null, limit = 100) {
  const query = { movement_type: movementType };
  
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return await this.find(query)
    .populate('product_id', 'name')
    .populate('created_by', 'username email')
    .sort({ date: -1 })
    .limit(limit);
};

// Get movement summary for reporting
stockMovementSchema.statics.getMovementSummary = async function(startDate, endDate) {
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
        _id: {
          movement_type: '$movement_type',
          movement_category: '$movement_category'
        },
        total_quantity: { $sum: '$quantity' },
        total_cost: { $sum: '$total_cost' },
        movement_count: { $sum: 1 },
        unique_products: { $addToSet: '$product_id' }
      }
    },
    {
      $project: {
        movement_type: '$_id.movement_type',
        movement_category: '$_id.movement_category',
        total_quantity: 1,
        total_cost: 1,
        movement_count: 1,
        unique_products_count: { $size: '$unique_products' }
      }
    },
    {
      $sort: { movement_type: 1, movement_category: 1 }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Get stock flow for a product
stockMovementSchema.statics.getStockFlow = async function(productId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        product_id: new mongoose.Types.ObjectId(productId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: '$movement_type',
        total_quantity: { $sum: '$quantity' },
        total_cost: { $sum: '$total_cost' },
        movement_count: { $sum: 1 }
      }
    },
    {
      $project: {
        movement_type: '$_id',
        total_quantity: 1,
        total_cost: 1,
        movement_count: 1
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

module.exports = mongoose.model('StockMovement', stockMovementSchema);
