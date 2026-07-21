const User = require('../users/user.model');
const RewardTransaction = require('./reward-transaction.model');

function getProgress(totalXp = 0) {
  const safeXp = Math.max(0, Number(totalXp) || 0);
  const level = Math.floor(safeXp / 100) + 1;
  const levelStartXp = (level - 1) * 100;
  return {
    level,
    title: level >= 10 ? 'Legend' : level >= 7 ? 'Champion' : level >= 4 ? 'Pathfinder' : 'Rising Star',
    currentXp: safeXp - levelStartXp,
    nextLevelXp: 100,
    totalXp: safeXp
  };
}

async function getPlayerRewards(userId) {
  const user = await User.findById(userId).select('totalXp coinBalance').lean();
  if (!user) {
    const error = new Error('Player not found.');
    error.status = 404;
    throw error;
  }
  return { ...getProgress(user.totalXp), coins: user.coinBalance || 0 };
}

async function listPlayerTransactions(userId, familyId) {
  return RewardTransaction.find({ recipient: userId, family: familyId })
    .populate('sourceActivity', 'title category')
    .populate('grantedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();
}

async function grantMissionRewards(activity, grantedBy, session) {
  const player = await User.findOneAndUpdate(
    { _id: activity.assignedTo, isActive: true },
    { $inc: { totalXp: activity.xpReward, coinBalance: activity.coinReward } },
    { new: true, session }
  );
  if (!player) throw new Error('The assigned player is no longer active.');

  const [transaction] = await RewardTransaction.create([{
    family: activity.family,
    recipient: activity.assignedTo,
    sourceActivity: activity._id,
    grantedBy,
    type: 'mission_approved',
    xpAmount: activity.xpReward,
    coinAmount: activity.coinReward,
    xpBalanceAfter: player.totalXp,
    coinBalanceAfter: player.coinBalance
  }], { session });
  return transaction;
}

module.exports = { getProgress, getPlayerRewards, listPlayerTransactions, grantMissionRewards };
