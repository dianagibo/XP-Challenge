const Activity = require('../activities/activity.model');
const Membership = require('../families/membership.model');
const User = require('../users/user.model');
const WeeklyGoal = require('./weekly-goal.model');
const WeeklyGoalBonus = require('./weekly-goal-bonus.model');

const CATEGORIES = ['all', 'home', 'school', 'wellbeing', 'personal_growth', 'family'];

async function createGoal(input, currentUser) {
  const title = String(input.title || '').trim();
  const targetCount = Number(input.targetCount);
  const xpBonus = Number(input.xpBonus || 0);
  const coinBonus = Number(input.coinBonus || 0);
  if (!title || title.length > 100) throw validationError('Escribe un nombre de máximo 100 caracteres.');
  if (!CATEGORIES.includes(input.category)) throw validationError('Selecciona una categoría válida.');
  if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > 50) throw validationError('El objetivo debe estar entre 1 y 50 misiones.');
  if (!Number.isInteger(xpBonus) || xpBonus < 0 || xpBonus > 1000) throw validationError('El bono de XP debe estar entre 0 y 1000.');
  if (!Number.isInteger(coinBonus) || coinBonus < 0 || coinBonus > 500) throw validationError('El bono de monedas debe estar entre 0 y 500.');
  if (!xpBonus && !coinBonus) throw validationError('Agrega un bono de XP o monedas.');
  if (!validDate(input.startDate) || !validDate(input.endDate) || input.endDate < input.startDate) throw validationError('Selecciona un rango de fechas válido.');
  if (daysBetween(input.startDate, input.endDate) > 6) throw validationError('Una meta semanal puede durar máximo 7 días.');
  const membership = await Membership.exists({ family: currentUser.familyId, user: input.player, role: 'player', isActive: true });
  if (!membership) throw validationError('Selecciona una jugadora válida.');
  return WeeklyGoal.create({ family: currentUser.familyId, player: input.player, title, category: input.category, targetCount, xpBonus, coinBonus, startDate: input.startDate, endDate: input.endDate, createdBy: currentUser.id });
}

async function listGoals(currentUser) {
  await expireOldGoals(currentUser.familyId);
  const filter = { family: currentUser.familyId };
  if (currentUser.role === 'player') filter.player = currentUser.id;
  const goals = await WeeklyGoal.find(filter).populate('player', 'name selectedAvatar').sort({ startDate: -1, createdAt: -1 }).lean();
  return Promise.all(goals.map(addProgress));
}

async function addProgress(goal) {
  const filter = { family: goal.family, assignedTo: goal.player._id || goal.player, status: 'approved', reviewedAt: { $gte: startOfDay(goal.startDate), $lte: endOfDay(goal.endDate) } };
  if (goal.category !== 'all') filter.category = goal.category;
  const completedCount = await Activity.countDocuments(filter);
  return { ...goal, completedCount, percent: Math.min(100, Math.round((completedCount / goal.targetCount) * 100)) };
}

async function applyApprovedMission(activity, session) {
  const approvedDate = localDateString(activity.reviewedAt || new Date());
  const goals = await WeeklyGoal.find({ family: activity.family, player: activity.assignedTo, status: 'active', startDate: { $lte: approvedDate }, endDate: { $gte: approvedDate }, category: { $in: ['all', activity.category] } }).session(session);
  for (const goal of goals) {
    const filter = { family: goal.family, assignedTo: goal.player, status: 'approved', reviewedAt: { $gte: startOfDay(goal.startDate), $lte: endOfDay(goal.endDate) } };
    if (goal.category !== 'all') filter.category = goal.category;
    const previousCount = await Activity.countDocuments(filter).session(session);
    if (previousCount + 1 < goal.targetCount) continue;
    const player = await User.findOneAndUpdate({ _id: goal.player, isActive: true }, { $inc: { totalXp: goal.xpBonus, coinBalance: goal.coinBonus } }, { new: true, session });
    if (!player) throw new Error('La jugadora de la meta ya no está activa.');
    const [bonus] = await WeeklyGoalBonus.create([{ family: goal.family, player: goal.player, weeklyGoal: goal._id, xpAmount: goal.xpBonus, coinAmount: goal.coinBonus, xpBalanceAfter: player.totalXp, coinBalanceAfter: player.coinBalance }], { session });
    goal.status = 'completed'; goal.completedAt = activity.reviewedAt || new Date(); goal.bonusTransaction = bonus._id;
    await goal.save({ session });
  }
}

async function expireOldGoals(familyId) {
  await WeeklyGoal.updateMany({ family: familyId, status: 'active', endDate: { $lt: localDateString(new Date()) } }, { $set: { status: 'expired' } });
}

async function getPlayers(familyId) {
  const memberships = await Membership.find({ family: familyId, role: 'player', isActive: true }).populate({ path: 'user', match: { isActive: true }, select: 'name selectedAvatar' }).lean();
  return memberships.filter((item) => item.user).map((item) => item.user);
}

function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')); }
function daysBetween(a, b) { return Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000); }
function startOfDay(value) { return new Date(`${value}T00:00:00-05:00`); }
function endOfDay(value) { return new Date(`${value}T23:59:59.999-05:00`); }
function localDateString(date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function validationError(message) { const error = new Error(message); error.status = 400; return error; }

module.exports = { CATEGORIES, createGoal, listGoals, applyApprovedMission, getPlayers, localDateString };
