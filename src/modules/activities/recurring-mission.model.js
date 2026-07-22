const mongoose = require('mongoose');

const recurringMissionSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  category: { type: String, enum: ['home', 'school', 'wellbeing', 'personal_growth', 'family'], required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'epic'], required: true },
  xpReward: { type: Number, required: true, min: 1, max: 500 },
  coinReward: { type: Number, required: true, min: 0, max: 100 },
  instructions: { type: String, trim: true, maxlength: 1000, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  validators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  frequency: { type: String, enum: ['daily', 'weekly'], required: true },
  weekdays: [{ type: Number, min: 0, max: 6 }],
  startDate: { type: String, required: true },
  endDate: { type: String, default: null },
  isActive: { type: Boolean, default: true, index: true },
  endedAt: { type: Date, default: null, index: true },
  endedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

recurringMissionSchema.index({ family: 1, createdAt: -1 });
module.exports = mongoose.model('RecurringMission', recurringMissionSchema);
