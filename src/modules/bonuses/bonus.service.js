const Bonus = require('./bonus.model');
const User = require('../users/user.model');
const Membership = require('../families/membership.model');
const RewardTransaction = require('../rewards/reward-transaction.model');
const notificationService = require('../notifications/notification.service');

const categories = ['good_attitude', 'initiative', 'extra_effort', 'academic_improvement', 'help_at_home', 'emotional_management', 'other'];

async function getPlayer(family) {
  const membership = await Membership.findOne({ family, role: 'player', isActive: true }).populate({ path: 'user', match: { isActive: true }, select: 'name' }).lean();
  return membership?.user || null;
}

async function list(currentUser) {
  const filter = { family: currentUser.familyId };
  if (currentUser.role === 'player') filter.recipient = currentUser.id;
  const [bonuses, player] = await Promise.all([
    Bonus.find(filter).populate('recipient', 'name selectedAvatar').populate('grantedBy', 'name').populate('voidedBy', 'name').sort({ createdAt: -1 }).lean(),
    getPlayer(currentUser.familyId)
  ]);
  return { bonuses, player };
}

async function getById(id, currentUser) {
  if (!Bonus.db.base.isValidObjectId(id)) throw notFound();
  const filter = { _id: id, family: currentUser.familyId };
  if (currentUser.role === 'player') filter.recipient = currentUser.id;
  const bonus = await Bonus.findOne(filter).populate('recipient', 'name selectedAvatar').populate('grantedBy', 'name').populate('voidedBy', 'name').lean();
  if (!bonus) throw notFound();
  return bonus;
}

async function create(input, currentUser) {
  const title = String(input.title || '').trim();
  const message = String(input.message || '').trim();
  const xpAmount = Number(input.xpAmount || 0);
  const coinAmount = Number(input.coinAmount || 0);
  if (!title || title.length > 80) throw invalid('Escribe un título de máximo 80 caracteres.');
  if (!message || message.length > 300) throw invalid('Escribe un mensaje de máximo 300 caracteres.');
  if (!categories.includes(input.category)) throw invalid('Selecciona un motivo válido.');
  if (![xpAmount, coinAmount].every((value) => Number.isInteger(value) && value >= 0 && value <= 10000)) throw invalid('Los premios deben ser números enteros entre 0 y 10.000.');
  const player = await getPlayer(currentUser.familyId);
  if (!player) throw invalid('No encontramos una jugadora activa en la familia.');
  const session = await Bonus.startSession();
  let bonus;
  try {
    await session.withTransaction(async () => {
      [bonus] = await Bonus.create([{ family: currentUser.familyId, recipient: player._id, grantedBy: currentUser.id, title, message, category: input.category, xpAmount, coinAmount }], { session });
      const updated = await User.findOneAndUpdate({ _id: player._id, isActive: true }, { $inc: { totalXp: xpAmount, coinBalance: coinAmount } }, { new: true, session });
      await RewardTransaction.create([{ family: currentUser.familyId, recipient: player._id, sourceBonus: bonus._id, grantedBy: currentUser.id, type: 'manual_bonus', xpAmount, coinAmount, xpBalanceAfter: updated.totalXp, coinBalanceAfter: updated.coinBalance }], { session });
      await notificationService.createForRecipients({ family: currentUser.familyId, recipients: [player._id], type: 'bonus_granted', title: '¡Tienes un reconocimiento!', message: `${title}: ${message}`, url: `/bonuses/${bonus._id}`, eventKey: `bonus:${bonus._id}:granted` }, session);
    });
    return bonus;
  } finally { await session.endSession(); }
}

async function updateText(id, input, currentUser) {
  const title = String(input.title || '').trim();
  const message = String(input.message || '').trim();
  if (!title || title.length > 80 || !message || message.length > 300) throw invalid('Revisa el título y el mensaje.');
  const bonus = await Bonus.findOneAndUpdate({ _id: id, family: currentUser.familyId }, { $set: { title, message } }, { new: true });
  if (!bonus) throw notFound();
  return bonus;
}

async function voidBonus(id, input, currentUser) {
  const reason = String(input.reason || '').trim();
  if (!reason || reason.length > 200) throw invalid('Indica brevemente por qué se anula el bono.');
  const session = await Bonus.startSession();
  try {
    await session.withTransaction(async () => {
      const bonus = await Bonus.findOne({ _id: id, family: currentUser.familyId, status: 'active' }).session(session);
      if (!bonus) throw invalid('Este reconocimiento no existe o ya fue anulado.');
      const player = await User.findOne({ _id: bonus.recipient, isActive: true }).session(session);
      if (!player || player.totalXp < bonus.xpAmount || player.coinBalance < bonus.coinAmount) throw invalid('No se puede anular porque el saldo disponible es menor que el premio original.');
      player.totalXp -= bonus.xpAmount; player.coinBalance -= bonus.coinAmount; await player.save({ session });
      bonus.status = 'voided'; bonus.voidedBy = currentUser.id; bonus.voidedAt = new Date(); bonus.voidReason = reason; await bonus.save({ session });
      await RewardTransaction.create([{ family: bonus.family, recipient: bonus.recipient, sourceBonus: bonus._id, grantedBy: currentUser.id, type: 'manual_bonus_voided', xpAmount: -bonus.xpAmount, coinAmount: -bonus.coinAmount, xpBalanceAfter: player.totalXp, coinBalanceAfter: player.coinBalance }], { session });
      await notificationService.createForRecipients({ family: bonus.family, recipients: [bonus.recipient], type: 'bonus_voided', title: 'Reconocimiento ajustado', message: `El reconocimiento “${bonus.title}” fue anulado.`, url: `/bonuses/${bonus._id}`, eventKey: `bonus:${bonus._id}:voided` }, session);
    });
  } finally { await session.endSession(); }
}

function invalid(message) { const error = new Error(message); error.status = 400; return error; }
function notFound() { const error = new Error('No encontramos el reconocimiento.'); error.status = 404; return error; }
module.exports = { list, getById, create, updateText, voidBonus };
