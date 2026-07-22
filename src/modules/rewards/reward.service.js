const User = require('../users/user.model');
const RewardTransaction = require('./reward-transaction.model');
const RewardItem = require('./reward-item.model');
const Redemption = require('./redemption.model');
const notificationService = require('../notifications/notification.service');

function getProgress(totalXp = 0) {
  const safeXp = Math.max(0, Number(totalXp) || 0);
  const level = Math.floor(safeXp / 100) + 1;
  return {
    level,
    title: level >= 10 ? 'Leyenda' : level >= 7 ? 'Campeona' : level >= 4 ? 'Exploradora' : 'Estrella en ascenso',
    currentXp: safeXp,
    nextLevelXp: level * 100,
    totalXp: safeXp
  };
}

async function getPlayerRewards(userId) {
  const user = await User.findById(userId).select('totalXp coinBalance').lean();
  if (!user) {
    const error = new Error('No encontramos a la jugadora.');
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
  if (!player) throw new Error('La jugadora asignada ya no está activa.');

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
  if (!name || name.length > 80) throw validationError('Escribe un nombre de máximo 80 caracteres.');
  if (description.length > 300) throw validationError('La descripción debe tener máximo 300 caracteres.');
  if (!Number.isInteger(coinCost) || coinCost < 1 || coinCost > 100000) throw validationError('El costo debe ser un número entero mayor que cero.');
  if (!icons.includes(input.icon)) throw validationError('Selecciona un ícono válido.');
  return RewardItem.create({ family: currentUser.familyId, name, description, coinCost, icon: input.icon, createdBy: currentUser.id });
}

async function toggleReward(rewardId, currentUser) {
  if (!RewardItem.db.base.isValidObjectId(rewardId)) throw notFoundError('No encontramos la recompensa.');
  const reward = await RewardItem.findOne({ _id: rewardId, family: currentUser.familyId });
  if (!reward) throw notFoundError('No encontramos la recompensa.');
  reward.isActive = !reward.isActive;
  return reward.save();
}

async function redeemReward(rewardId, currentUser) {
  if (!RewardItem.db.base.isValidObjectId(rewardId)) throw notFoundError('No encontramos la recompensa.');
  const session = await RewardItem.startSession();
  let redemption;
  try {
    await session.withTransaction(async () => {
      const reward = await RewardItem.findOne({ _id: rewardId, family: currentUser.familyId, isActive: true }).session(session);
      if (!reward) throw notFoundError('Esta recompensa ya no está disponible.');
      const pendingRedemption = await Redemption.exists({
        family: currentUser.familyId, player: currentUser.id,
        reward: reward._id, status: 'pending_delivery'
      }).session(session);
      if (pendingRedemption) throw conflictError('Esta recompensa ya está pendiente de entrega.');
      const player = await User.findOneAndUpdate(
        { _id: currentUser.id, isActive: true, coinBalance: { $gte: reward.coinCost } },
        { $inc: { coinBalance: -reward.coinCost } },
        { new: true, session }
      );
      if (!player) throw conflictError('No tienes suficientes monedas para esta recompensa.');
      [redemption] = await Redemption.create([{
        family: currentUser.familyId, reward: reward._id, player: currentUser.id,
        coinCost: reward.coinCost, coinBalanceAfter: player.coinBalance
      }], { session });
    });
    const guardians = await notificationService.findRecipientsByRoles(currentUser.familyId, ['admin_player', 'validator']);
    const reward = await RewardItem.findById(rewardId).select('name').lean();
    await notificationService.createForRecipients({
      family: currentUser.familyId, recipients: guardians, type: 'reward_redeemed',
      title: 'Recompensa por entregar', message: `Sofi canjeó “${reward?.name || 'una recompensa'}”.`,
      url: '/reward-catalog', eventKey: `redemption:${redemption._id}:created`
    });
    return redemption;
  } catch (error) {
    if (error?.code === 11000) throw conflictError('Esta recompensa ya está pendiente de entrega.');
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
  if (!Redemption.db.base.isValidObjectId(redemptionId)) throw notFoundError('No encontramos el canje.');
  const redemption = await Redemption.findOneAndUpdate({
    _id: redemptionId, family: currentUser.familyId, status: 'pending_delivery'
  }, { $set: { status: 'delivered', deliveredBy: currentUser.id, deliveredAt: new Date() } }, { new: true });
  if (!redemption) throw notFoundError('Este canje no está disponible o ya fue entregado.');
  const reward = await RewardItem.findById(redemption.reward).select('name').lean();
  await notificationService.createForRecipients({
    family: currentUser.familyId, recipients: [redemption.player], type: 'reward_delivered',
    title: '¡Recompensa entregada!', message: `“${reward?.name || 'Tu recompensa'}” fue marcada como entregada.`,
    url: '/reward-catalog', eventKey: `redemption:${redemption._id}:delivered`
  });
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
