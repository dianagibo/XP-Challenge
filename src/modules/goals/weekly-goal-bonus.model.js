const mongoose = require('mongoose');

const weeklyGoalBonusSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  weeklyGoal: { type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyGoal', required: true, unique: true },
  xpAmount: { type: Number, required: true, min: 0 },
  coinAmount: { type: Number, required: true, min: 0 },
  xpBalanceAfter: { type: Number, required: true, min: 0 },
  coinBalanceAfter: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('WeeklyGoalBonus', weeklyGoalBonusSchema);
