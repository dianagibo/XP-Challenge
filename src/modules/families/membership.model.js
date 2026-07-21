const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
  role: { type: String, enum: ['admin_player', 'player', 'validator'], required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

membershipSchema.index({ user: 1, family: 1 }, { unique: true });

module.exports = mongoose.model('Membership', membershipSchema);
