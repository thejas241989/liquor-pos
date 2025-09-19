const mongoose = require('mongoose');

// Schema for sale items stored as separate documents
const saleItemSchema = new mongoose.Schema({
  sale_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  line_total: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Schema for embedded sale items within the Sale document
const embeddedSaleItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  line_total: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

const saleSchema = new mongoose.Schema({
  invoice_no: {
    type: String,
    required: true,
    unique: true,
    maxLength: 50
  },
  biller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customer_name: {
    type: String,
    maxLength: 100,
    default: null
  },
  customer_phone: {
    type: String,
    maxLength: 20,
    default: null
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  payment_method: {
    type: String,
    enum: ['cash', 'upi', 'credit', 'mixed'],
    required: true
  },
  payment_status: {
    type: String,
    enum: ['paid', 'pending', 'partial'],
    default: 'paid'
  },
  // Enhanced payment details
  payment_details: {
    cash_received: {
      type: Number,
      default: 0,
      min: 0
    },
    change_returned: {
      type: Number,
      default: 0,
      min: 0
    },
    upi_reference: {
      type: String,
      default: null
    },
    credit_customer: {
      type: String,
      default: null
    },
    credit_due_date: {
      type: Date,
      default: null
    }
  },
  notes: {
    type: String,
    default: null
  },
  sale_date: {
    type: Date,
    default: Date.now
  },
  items: [embeddedSaleItemSchema]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Create non-unique indexes only
saleSchema.index({ biller_id: 1 });
saleSchema.index({ sale_date: 1 });
saleSchema.index({ payment_method: 1 });
saleSchema.index({ payment_status: 1 });

// Post-save middleware to update stock using new StockService
saleSchema.post('save', async function() {
  try {
    const StockService = require('../services/StockService');
    
    // Update stock for each item sold using the new StockService
    const stockUpdateResult = await StockService.updateStockForSale(
      this.items,
      this._id,
      this.biller_id
    );
    
    if (!stockUpdateResult.success) {
      console.error('Stock update failed for sale:', this._id, stockUpdateResult.errors);
    } else {
      console.log('Stock updated successfully for sale:', this._id);
    }
  } catch (error) {
    console.error('Error updating stock after sale:', error);
  }
});

module.exports = {
  Sale: mongoose.model('Sale', saleSchema),
  SaleItem: mongoose.model('SaleItem', saleItemSchema)
};
