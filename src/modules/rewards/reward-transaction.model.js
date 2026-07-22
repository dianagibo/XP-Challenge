const mongoose = require('mongoose');

const rewardTransactionSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceActivity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', default: null },
  sourceBonus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bonus', default: null },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['mission_approved', 'manual_bonus', 'manual_bonus_voided'], required: true },
  xpAmount: { type: Number, required: true },
  coinAmount: { type: Number, required: true },
  xpBalanceAfter: { type: Number, required: true, min: 0 },
  coinBalanceAfter: { type: Number, required: true, min: 0 }
}, { timestamps: true });

rewardTransactionSchema.index({ recipient: 1, createdAt: -1 });
rewardTransactionSchema.index({ sourceActivity: 1 }, { unique: true, partialFilterExpression: { sourceActivity: { $type: 'objectId' } } });
rewardTransactionSchema.index({ sourceBonus: 1, type: 1 }, { unique: true, partialFilterExpression: { sourceBonus: { $type: 'objectId' } } });

module.exports = mongoose.model('RewardTransaction', rewardTransactionSchema);
