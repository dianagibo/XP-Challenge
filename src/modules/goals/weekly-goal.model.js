const mongoose = require('mongoose');

const weeklyGoalSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, enum: ['all', 'home', 'school', 'wellbeing', 'personal_growth', 'family'], default: 'all' },
  targetCount: { type: Number, required: true, min: 1, max: 50 },
  xpBonus: { type: Number, required: true, min: 0, max: 1000 },
  coinBonus: { type: Number, required: true, min: 0, max: 500 },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed', 'expired'], default: 'active', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: { type: Date, default: null },
  bonusTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyGoalBonus', default: null }
}, { timestamps: true });

weeklyGoalSchema.index({ family: 1, player: 1, startDate: 1, endDate: 1 });
module.exports = mongoose.model('WeeklyGoal', weeklyGoalSchema);
