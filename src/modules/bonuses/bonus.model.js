const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 80 },
  message: { type: String, required: true, maxlength: 300 },
  category: { type: String, enum: ['good_attitude', 'initiative', 'extra_effort', 'academic_improvement', 'help_at_home', 'emotional_management', 'other'], required: true },
  xpAmount: { type: Number, required: true, min: 0, max: 10000 },
  coinAmount: { type: Number, required: true, min: 0, max: 10000 },
  status: { type: String, enum: ['active', 'voided'], default: 'active' },
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  voidedAt: { type: Date, default: null },
  voidReason: { type: String, maxlength: 200, default: '' }
}, { timestamps: true });

bonusSchema.index({ family: 1, createdAt: -1 });
module.exports = mongoose.model('Bonus', bonusSchema);
