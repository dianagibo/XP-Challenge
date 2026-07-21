const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  timezone: { type: String, default: 'America/Bogota' },
  currency: { type: String, default: 'COP' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Family', familySchema);
