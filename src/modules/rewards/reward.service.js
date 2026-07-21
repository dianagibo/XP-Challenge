const User = require('../users/user.model');
const RewardTransaction = require('./reward-transaction.model');
const RewardItem = require('./reward-item.model');
const Redemption = require('./redemption.model');

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

async function listCatalog(familyId, includeInactive = false) {
  const filter = { family: familyId };
  if (!includeInactive) filter.isActive = true;
  return RewardItem.find(filter).sort({ isActive: -1, coinCost: 1, createdAt: -1 }).lean();
}

async function createReward(input, currentUser) {
  const name = String(input.name || '').trim();
  const description = String(input.description || '').trim();
  const coinCost = Number(input.coinCost);
  const icons = ['gift', 'movie', 'game', 'treat', 'outing', 'choice'];
  if (!name || name.length > 80) throw validationError('Enter a reward name of 80 characters or fewer.');
  if (description.length > 300) throw validationError('Description must be 300 characters or fewer.');
  if (!Number.isInteger(coinCost) || coinCost < 1 || coinCost > 100000) throw validationError('Coin cost must be a whole number greater than zero.');
  if (!icons.includes(input.icon)) throw validationError('Select a valid icon.');
  return RewardItem.create({ family: currentUser.familyId, name, description, coinCost, icon: input.icon, createdBy: currentUser.id });
}

async function toggleReward(rewardId, currentUser) {
  if (!RewardItem.db.base.isValidObjectId(rewardId)) throw notFoundError('Reward not found.');
  const reward = await RewardItem.findOne({ _id: rewardId, family: currentUser.familyId });
  if (!reward) throw notFoundError('Reward not found.');
  reward.isActive = !reward.isActive;
  return reward.save();
}

async function redeemReward(rewardId, currentUser) {
  if (!RewardItem.db.base.isValidObjectId(rewardId)) throw notFoundError('Reward not found.');
  const session = await RewardItem.startSession();
  let redemption;
  try {
    await session.withTransaction(async () => {
      const reward = await RewardItem.findOne({ _id: rewardId, family: currentUser.familyId, isActive: true }).session(session);
      if (!reward) throw notFoundError('This reward is no longer available.');
      const pendingRedemption = await Redemption.exists({
        family: currentUser.familyId, player: currentUser.id,
        reward: reward._id, status: 'pending_delivery'
      }).session(session);
      if (pendingRedemption) throw conflictError('This reward is already waiting for delivery.');
      const player = await User.findOneAndUpdate(
        { _id: currentUser.id, isActive: true, coinBalance: { $gte: reward.coinCost } },
        { $inc: { coinBalance: -reward.coinCost } },
        { new: true, session }
      );
      if (!player) throw conflictError('You do not have enough coins for this reward.');
      [redemption] = await Redemption.create([{
        family: currentUser.familyId, reward: reward._id, player: currentUser.id,
        coinCost: reward.coinCost, coinBalanceAfter: player.coinBalance
      }], { session });
    });
    return redemption;
  } catch (error) {
    if (error?.code === 11000) throw conflictError('This reward is already waiting for delivery.');
    throw error;
  } finally { await session.endSession(); }
}

async function listPlayerRedemptions(playerId, familyId) {
  return Redemption.find({ player: playerId, family: familyId })
    .populate('reward', 'name icon').populate('deliveredBy', 'name').sort({ createdAt: -1 }).lean();
}

async function listFamilyRedemptions(familyId) {
  return Redemption.find({ family: familyId }).populate('reward', 'name icon')
    .populate('player', 'name selectedAvatar').populate('deliveredBy', 'name')
    .sort({ status: -1, createdAt: -1 }).lean();
}

async function deliverRedemption(redemptionId, currentUser) {
  if (!Redemption.db.base.isValidObjectId(redemptionId)) throw notFoundError('Redemption not found.');
  const redemption = await Redemption.findOneAndUpdate({
    _id: redemptionId, family: currentUser.familyId, status: 'pending_delivery'
  }, { $set: { status: 'delivered', deliveredBy: currentUser.id, deliveredAt: new Date() } }, { new: true });
  if (!redemption) throw notFoundError('This redemption is unavailable or already delivered.');
  return redemption;
}

function validationError(message) { const error = new Error(message); error.status = 400; return error; }
function conflictError(message) { const error = new Error(message); error.status = 409; return error; }
function notFoundError(message) { const error = new Error(message); error.status = 404; return error; }

module.exports = {
  getProgress, getPlayerRewards, listPlayerTransactions, grantMissionRewards,
  listCatalog, createReward, toggleReward, redeemReward,
  listPlayerRedemptions, listFamilyRedemptions, deliverRedemption
};
