const Activity = require('../activities/activity.model');
const Membership = require('../families/membership.model');
const Redemption = require('../rewards/redemption.model');
const User = require('../users/user.model');
const rewardService = require('../rewards/reward.service');
const Achievement = require('./achievement.model');
const { calculateStreaks } = require('./streak.service');

const ACHIEVEMENT_DEFINITIONS = Object.freeze([
  { code: 'first_mission', name: 'Primera victoria', description: 'Completa tu primera misión aprobada.', icon: 'bi-flag-fill' },
  { code: 'five_missions', name: 'Exploradora de misiones', description: 'Completa 5 misiones aprobadas.', icon: 'bi-compass-fill' },
  { code: 'five_weekday_streak', name: '¡Semana completada!', description: 'Completa 5 días hábiles consecutivos y gana 25 XP y 5 monedas.', icon: 'bi-fire' },
  { code: 'hundred_xp', name: 'Coleccionista de XP', description: 'Consigue 100 XP en total.', icon: 'bi-stars' },
  { code: 'first_redemption', name: 'Cazadora de recompensas', description: 'Canjea tu primera recompensa.', icon: 'bi-gift-fill' }
]);

async function getPlayerProgress(playerId, familyId) {
  const [player, approvedActivities, redemptionCount] = await Promise.all([
    User.findById(playerId).select('name selectedAvatar totalXp coinBalance').lean(),
    Activity.find({ family: familyId, assignedTo: playerId, status: 'approved', reviewedAt: { $ne: null } })
      .select('reviewedAt').sort({ reviewedAt: 1 }).lean(),
    Redemption.countDocuments({ family: familyId, player: playerId })
  ]);
  if (!player) throw notFoundError('No encontramos a la jugadora.');

  const streak = calculateStreaks(approvedActivities.map((activity) => activity.reviewedAt));
  const stats = {
    approvedMissions: approvedActivities.length,
    redemptionCount,
    totalXp: player.totalXp || 0,
    coins: player.coinBalance || 0,
    ...streak,
    ...rewardService.getProgress(player.totalXp)
  };
  await unlockAchievements(playerId, familyId, stats);
  const earned = await Achievement.find({ family: familyId, player: playerId }).sort({ unlockedAt: -1 }).lean();
  const earnedByCode = new Map(earned.map((item) => [item.code, item]));

  return {
    player,
    stats,
    achievements: ACHIEVEMENT_DEFINITIONS.map((definition) => ({
      ...definition,
      unlocked: earnedByCode.has(definition.code),
      unlockedAt: earnedByCode.get(definition.code)?.unlockedAt || null
    }))
  };
}

async function getFamilyProgress(familyId) {
  const memberships = await Membership.find({ family: familyId, role: { $in: ['player', 'admin_player', 'player_validator'] }, isActive: true })
    .populate({ path: 'user', match: { isActive: true }, select: 'name selectedAvatar' }).lean();
  return Promise.all(memberships.filter((item) => item.user).map((item) => getPlayerProgress(item.user._id, familyId)));
}

async function unlockAchievements(playerId, familyId, stats) {
  const unlockedAt = new Date();
  const codes = [];
  if (stats.approvedMissions >= 1) codes.push('first_mission');
  if (stats.approvedMissions >= 5) codes.push('five_missions');
  if (stats.bestStreak >= 5) codes.push('five_weekday_streak');
  if (stats.totalXp >= 100) codes.push('hundred_xp');
  if (stats.redemptionCount >= 1) codes.push('first_redemption');
  if (!codes.length) return;
  await Achievement.bulkWrite(codes.map((code) => ({
    updateOne: {
      filter: { family: familyId, player: playerId, code },
      update: { $setOnInsert: { family: familyId, player: playerId, code, unlockedAt } },
      upsert: true
    }
  })), { ordered: false });
}

function notFoundError(message) { const error = new Error(message); error.status = 404; return error; }

module.exports = { ACHIEVEMENT_DEFINITIONS, getPlayerProgress, getFamilyProgress, calculateStreaks };
