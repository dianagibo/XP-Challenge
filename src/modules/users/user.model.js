const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 40 },
  passwordHash: { type: String, required: true, select: false },
  isActive: { type: Boolean, default: true },
  selectedAvatar: { type: String, default: 'nova' },
  preferences: {
    color: { type: String, enum: ['violet', 'pink', 'blue', 'mint', 'sunset'], default: 'violet' },
    mode: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
    decoration: { type: String, enum: ['stars', 'hearts', 'lightning', 'none'], default: 'stars' }
  },
  totalXp: { type: Number, default: 0, min: 0 },
  coinBalance: { type: Number, default: 0, min: 0 },
  lastLoginAt: { type: Date, default: null }
  ,sessionVersion: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
