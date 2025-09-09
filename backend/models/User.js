const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    maxLength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    maxLength: 100
  },
  password: {
    type: String,
    required: true,
    maxLength: 255
  },
  role: {
    type: String,
    enum: ['admin', 'biller', 'manager', 'stock_reconciler'],
    required: true
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
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema);
