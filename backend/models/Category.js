const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxLength: 100
  },
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  description: {
    type: String,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Create indexes
categorySchema.index({ name: 1 });
categorySchema.index({ parent_id: 1 });

module.exports = mongoose.model('Category', categorySchema);
