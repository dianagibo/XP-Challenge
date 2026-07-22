const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
  role: { type: String, enum: ['admin_player', 'player', 'validator', 'player_validator'], required: true },
  permissions: {
    participate: { type: Boolean },
    createMissions: { type: Boolean },
    reviewOwnMissions: { type: Boolean },
    validateResponsibilities: { type: Boolean },
    viewFamilyReport: { type: Boolean },
    createBonuses: { type: Boolean },
    manageRewards: { type: Boolean },
    manageUsers: { type: Boolean }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

membershipSchema.index({ user: 1, family: 1 }, { unique: true });

module.exports = mongoose.model('Membership', membershipSchema);
