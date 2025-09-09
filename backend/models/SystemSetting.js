const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  setting_key: {
    type: String,
    required: true,
    unique: true,
    maxLength: 100
  },
  setting_value: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: null
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: { createdAt: false, updatedAt: 'updated_at' }
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
