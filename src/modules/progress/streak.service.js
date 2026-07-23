const Activity = require('../activities/activity.model');
const User = require('../users/user.model');
const RewardTransaction = require('../rewards/reward-transaction.model');
const notificationService = require('../notifications/notification.service');

const STREAK_LENGTH = 5;
const STREAK_XP_BONUS = 25;
const STREAK_COIN_BONUS = 5;
const TIME_ZONE = 'America/Bogota';

async function applyApprovedMission(activity, grantedBy, session) {
  const approvedAt = activity.reviewedAt || new Date();
  const approvedDay = bogotaDateString(approvedAt);
  if (!isBusinessDay(approvedDay)) return null;

  const previousActivities = await Activity.find({
    _id: { $ne: activity._id },
    family: activity.family,
    assignedTo: activity.assignedTo,
    status: 'approved',
    reviewedAt: { $ne: null, $lt: endOfBogotaDay(approvedDay) }
  }).select('reviewedAt').session(session).lean();

  const previousDays = new Set(previousActivities.map((item) => bogotaDateString(item.reviewedAt)));
  if (previousDays.has(approvedDay)) return null;

  const streak = calculateStreaks([...previousDays, approvedDay], approvedAt);
  if (streak.continuousStreak % STREAK_LENGTH !== 0) return null;

  const cycleStart = shiftBusinessDays(approvedDay, -(STREAK_LENGTH - 1));
  const player = await User.findOneAndUpdate(
    { _id: activity.assignedTo, isActive: true },
    { $inc: { totalXp: STREAK_XP_BONUS, coinBalance: STREAK_COIN_BONUS } },
    { new: true, session }
  );
  if (!player) throw new Error('La persona participante de la racha ya no está activa.');

  const [transaction] = await RewardTransaction.create([{
    family: activity.family,
    recipient: activity.assignedTo,
    grantedBy,
    type: 'weekday_streak_bonus',
    streakCycleStart: cycleStart,
    streakCycleEnd: approvedDay,
    xpAmount: STREAK_XP_BONUS,
    coinAmount: STREAK_COIN_BONUS,
    xpBalanceAfter: player.totalXp,
    coinBalanceAfter: player.coinBalance
  }], { session });

  await notificationService.createForRecipients({
    family: activity.family,
    recipients: [activity.assignedTo],
    type: 'streak_bonus_granted',
    title: '¡Semana completada!',
    message: `Completaste 5 días hábiles consecutivos y ganaste ${STREAK_XP_BONUS} XP y ${STREAK_COIN_BONUS} monedas.`,
    url: '/progress',
    eventKey: `weekday-streak:${activity.assignedTo}:${approvedDay}`
  }, session);

  return transaction;
}

function calculateStreaks(dates, now = new Date()) {
  const days = [...new Set(dates.filter(Boolean).map(bogotaDateString))]
    .filter(isBusinessDay)
    .sort();
  if (!days.length) return { currentStreak: 0, bestStreak: 0, continuousStreak: 0 };

  let longestRun = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    if (nextBusinessDay(days[index - 1]) === days[index]) run += 1;
    else run = 1;
    longestRun = Math.max(longestRun, run);
  }

  let continuousStreak = 1;
  for (let index = days.length - 1; index > 0; index -= 1) {
    if (nextBusinessDay(days[index - 1]) !== days[index]) break;
    continuousStreak += 1;
  }

  const lastDay = days.at(-1);
  const latestExpectedDay = latestBusinessDay(bogotaDateString(now));
  if (![latestExpectedDay, previousBusinessDay(latestExpectedDay)].includes(lastDay)) {
    continuousStreak = 0;
  }

  return {
    currentStreak: continuousStreak % STREAK_LENGTH,
    bestStreak: Math.min(longestRun, STREAK_LENGTH),
    continuousStreak
  };
}

function bogotaDateString(date) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return String(date);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(date));
}

function isBusinessDay(value) {
  const day = new Date(`${value}T12:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

function shiftDay(value, amount) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function nextBusinessDay(value) {
  let next = shiftDay(value, 1);
  while (!isBusinessDay(next)) next = shiftDay(next, 1);
  return next;
}

function previousBusinessDay(value) {
  let previous = shiftDay(value, -1);
  while (!isBusinessDay(previous)) previous = shiftDay(previous, -1);
  return previous;
}

function latestBusinessDay(value) {
  let latest = value;
  while (!isBusinessDay(latest)) latest = shiftDay(latest, -1);
  return latest;
}

function shiftBusinessDays(value, amount) {
  let shifted = value;
  const direction = amount < 0 ? -1 : 1;
  for (let remaining = Math.abs(amount); remaining > 0; remaining -= 1) {
    shifted = direction < 0 ? previousBusinessDay(shifted) : nextBusinessDay(shifted);
  }
  return shifted;
}

function endOfBogotaDay(value) {
  return new Date(`${value}T23:59:59.999-05:00`);
}

module.exports = {
  STREAK_LENGTH,
  STREAK_XP_BONUS,
  STREAK_COIN_BONUS,
  applyApprovedMission,
  calculateStreaks,
  isBusinessDay,
  nextBusinessDay
};
