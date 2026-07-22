const Activity = require('../activities/activity.model');
const Bonus = require('../bonuses/bonus.model');
const Membership = require('../families/membership.model');
const WeeklyGoal = require('../goals/weekly-goal.model');
const WeeklyGoalBonus = require('../goals/weekly-goal-bonus.model');
const Redemption = require('../rewards/redemption.model');
const RewardTransaction = require('../rewards/reward-transaction.model');
const rewardService = require('../rewards/reward.service');

const TIME_ZONE = 'America/Bogota';

async function getWeeklyReport(currentUser, requestedStart) {
  const today = bogotaDateString(new Date());
  const currentWeek = mondayFor(today);
  const weekStart = normalizeWeek(requestedStart, currentWeek);
  const weekEnd = shiftDay(weekStart, 6);
  const nextWeek = shiftDay(weekStart, 7);
  const range = { $gte: bogotaMidnight(weekStart), $lt: bogotaMidnight(nextWeek) };

  const memberships = await Membership.find({
    family: currentUser.familyId,
    role: { $in: ['player', 'admin_player'] },
    isActive: true
  }).populate({ path: 'user', match: { isActive: true }, select: 'name selectedAvatar totalXp coinBalance' }).lean();
  const players = memberships.map((item) => item.user).filter(Boolean);
  const playerIds = players.map((player) => player._id);

  const [missions, transactions, goalBonuses, bonuses, redemptions, goals] = await Promise.all([
    Activity.find({ family: currentUser.familyId, assignedTo: { $in: playerIds }, dueDate: range })
      .select('assignedTo category status reviewedAt').lean(),
    RewardTransaction.find({ family: currentUser.familyId, recipient: { $in: playerIds }, createdAt: range })
      .select('recipient type xpAmount coinAmount').lean(),
    WeeklyGoalBonus.find({ family: currentUser.familyId, player: { $in: playerIds }, createdAt: range })
      .select('player xpAmount coinAmount').lean(),
    Bonus.find({ family: currentUser.familyId, recipient: { $in: playerIds }, createdAt: range })
      .populate('recipient', 'name').populate('grantedBy', 'name').sort({ createdAt: -1 }).lean(),
    Redemption.find({ family: currentUser.familyId, player: { $in: playerIds }, createdAt: range })
      .populate('reward', 'name').select('player reward coinCost status createdAt').lean(),
    WeeklyGoal.find({ family: currentUser.familyId, player: { $in: playerIds }, startDate: { $lte: weekEnd }, endDate: { $gte: weekStart } })
      .select('player title category targetCount status completedAt').lean()
  ]);

  const summaries = players.map((player) => buildPlayerSummary(player, { missions, transactions, goalBonuses, bonuses, redemptions, goals }));
  const categoryCounts = countCategories(missions);
  const totalAssigned = summaries.reduce((sum, item) => sum + item.missions.assigned, 0);
  const totalCompleted = summaries.reduce((sum, item) => sum + item.missions.approved, 0);
  const completionRate = totalAssigned ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return {
    weekStart, weekEnd, currentWeek,
    previousWeek: shiftDay(weekStart, -7),
    nextWeek: weekStart < currentWeek ? shiftDay(weekStart, 7) : null,
    isCurrentWeek: weekStart === currentWeek,
    summaries,
    family: {
      totalAssigned, totalCompleted, completionRate,
      topCategories: Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([category, count]) => ({ category, count })),
      goalsCompleted: goals.filter((goal) => goal.status === 'completed').length,
      goalsPending: goals.filter((goal) => goal.status !== 'completed').length,
      recognitionCount: bonuses.filter((bonus) => bonus.status === 'active').length
    },
    highlights: bonuses.filter((bonus) => bonus.status === 'active').slice(0, 6),
    hasActivity: Boolean(missions.length || transactions.length || goalBonuses.length || bonuses.length || redemptions.length || goals.length),
    encouragement: encouragementFor(completionRate, totalCompleted)
  };
}

function buildPlayerSummary(player, data) {
  const id = String(player._id);
  const missions = data.missions.filter((item) => String(item.assignedTo) === id);
  const transactions = data.transactions.filter((item) => String(item.recipient) === id && item.type !== 'manual_bonus_voided');
  const reversals = data.transactions.filter((item) => String(item.recipient) === id && item.type === 'manual_bonus_voided');
  const goalBonuses = data.goalBonuses.filter((item) => String(item.player) === id);
  const redemptions = data.redemptions.filter((item) => String(item.player) === id);
  const bonuses = data.bonuses.filter((item) => String(item.recipient?._id || item.recipient) === id && item.status === 'active');
  const goals = data.goals.filter((item) => String(item.player) === id);
  const earned = [...transactions, ...reversals, ...goalBonuses];
  return {
    player,
    level: rewardService.getProgress(player.totalXp || 0).level,
    missions: {
      assigned: missions.length,
      approved: missions.filter((item) => item.status === 'approved').length,
      pending: missions.filter((item) => !['approved', 'canceled'].includes(item.status)).length,
      changesRequested: missions.filter((item) => item.status === 'changes_requested').length
    },
    xpEarned: earned.reduce((sum, item) => sum + item.xpAmount, 0),
    coinsEarned: earned.reduce((sum, item) => sum + item.coinAmount, 0),
    bonusCount: bonuses.length,
    redemptions,
    goals: { completed: goals.filter((goal) => goal.status === 'completed').length, total: goals.length }
  };
}

function countCategories(missions) {
  return missions.reduce((result, mission) => {
    result[mission.category] = (result[mission.category] || 0) + 1;
    return result;
  }, {});
}

function normalizeWeek(value, currentWeek) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return currentWeek;
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return currentWeek;
  const monday = mondayFor(String(value));
  return monday > currentWeek ? currentWeek : monday;
}
function mondayFor(value) {
  const date = new Date(`${value}T12:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}
function shiftDay(value, amount) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
function bogotaMidnight(value) { return new Date(`${value}T05:00:00.000Z`); }
function bogotaDateString(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function encouragementFor(rate, completed) {
  if (!completed) return 'Cada semana trae una nueva oportunidad para empezar juntas.';
  if (rate >= 90) return '¡Una semana increíble! Celebren todo lo que construyeron juntas.';
  if (rate >= 60) return '¡Gran trabajo en equipo! Cada misión completada cuenta.';
  return 'Lo importante es seguir avanzando, apoyándose y reconociendo cada esfuerzo.';
}

module.exports = { getWeeklyReport, mondayFor, normalizeWeek };
