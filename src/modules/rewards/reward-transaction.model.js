const mongoose = require('mongoose');

const rewardTransactionSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceActivity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true, unique: true },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['mission_approved'], required: true },
  xpAmount: { type: Number, required: true, min: 1 },
  coinAmount: { type: Number, required: true, min: 0 },
  xpBalanceAfter: { type: Number, required: true, min: 0 },
  coinBalanceAfter: { type: Number, required: true, min: 0 }
}, { timestamps: true });

rewardTransactionSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('RewardTransaction', rewardTransactionSchema);
