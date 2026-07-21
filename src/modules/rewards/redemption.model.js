const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  reward: { type: mongoose.Schema.Types.ObjectId, ref: 'RewardItem', required: true, index: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  coinCost: { type: Number, required: true, min: 1 },
  coinBalanceAfter: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending_delivery', 'delivered'], default: 'pending_delivery', index: true },
  deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deliveredAt: { type: Date, default: null }
}, { timestamps: true });

redemptionSchema.index({ family: 1, status: 1, createdAt: -1 });
redemptionSchema.index({ player: 1, createdAt: -1 });
redemptionSchema.index(
  { player: 1, reward: 1 },
  { unique: true, partialFilterExpression: { status: 'pending_delivery' } }
);

module.exports = mongoose.model('Redemption', redemptionSchema);
