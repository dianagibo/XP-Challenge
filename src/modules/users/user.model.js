const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 40 },
  passwordHash: { type: String, required: true, select: false },
  isActive: { type: Boolean, default: true },
  selectedAvatar: { type: String, default: 'nova' },
  totalXp: { type: Number, default: 0, min: 0 },
  coinBalance: { type: Number, default: 0, min: 0 },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
