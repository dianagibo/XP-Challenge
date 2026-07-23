const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  code: {
    type: String,
    enum: ['first_mission', 'five_missions', 'three_day_streak', 'five_weekday_streak', 'hundred_xp', 'first_redemption'],
    required: true
  },
  unlockedAt: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

achievementSchema.index({ family: 1, player: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);
