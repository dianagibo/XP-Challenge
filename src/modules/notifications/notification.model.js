const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['mission_assigned', 'mission_submitted', 'mission_approved', 'mission_changes_requested', 'goal_created', 'goal_completed', 'reward_redeemed', 'reward_delivered'],
    required: true
  },
  title: { type: String, required: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 300 },
  url: { type: String, required: true, maxlength: 300 },
  eventKey: { type: String, required: true, maxlength: 180 },
  readAt: { type: Date, default: null }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, eventKey: 1 }, { unique: true });
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
