const mongoose = require('mongoose');

const rewardItemSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: '', trim: true, maxlength: 300 },
  coinCost: { type: Number, required: true, min: 1, max: 100000 },
  icon: { type: String, enum: ['gift', 'movie', 'game', 'treat', 'outing', 'choice'], default: 'gift' },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

rewardItemSchema.index({ family: 1, createdAt: -1 });

module.exports = mongoose.model('RewardItem', rewardItemSchema);
