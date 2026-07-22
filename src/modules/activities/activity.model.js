const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  category: {
    type: String,
    enum: ['home', 'school', 'wellbeing', 'personal_growth', 'family'],
    required: true
  },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'epic'], required: true },
  xpReward: { type: Number, required: true, min: 1, max: 500 },
  coinReward: { type: Number, required: true, min: 0, max: 100 },
  dueDate: { type: Date, required: true },
  instructions: { type: String, trim: true, maxlength: 1000, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  validators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending_acceptance', 'assigned', 'pending_validation', 'approved', 'changes_requested', 'canceled'],
    default: 'assigned',
    index: true
  },
  completionNote: { type: String, trim: true, maxlength: 500, default: '' },
  acceptanceNote: { type: String, trim: true, maxlength: 500, default: '' },
  acceptedAt: { type: Date, default: null },
  submittedAt: { type: Date, default: null },
  reviewNote: { type: String, trim: true, maxlength: 500, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  rewardsGrantedAt: { type: Date, default: null },
  rewardTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'RewardTransaction', default: null },
  recurringMission: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringMission', default: null, index: true },
  occurrenceDate: { type: String, default: null }
  ,canceledAt: { type: Date, default: null }
  ,canceledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  ,archivedAt: { type: Date, default: null, index: true }
  ,archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

activitySchema.index({ family: 1, createdAt: -1 });
activitySchema.index(
  { recurringMission: 1, occurrenceDate: 1 },
  { unique: true, partialFilterExpression: { recurringMission: { $type: 'objectId' }, occurrenceDate: { $type: 'string' } } }
);

module.exports = mongoose.model('Activity', activitySchema);
