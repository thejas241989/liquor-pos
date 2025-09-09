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
  min_stock_level: {
    type: Number,
    default: 0,
    min: 0
  },
  tax_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
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

module.exports = mongoose.model('Product', productSchema);
