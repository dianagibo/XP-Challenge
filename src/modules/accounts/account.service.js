const bcrypt = require('bcryptjs');
const User = require('../users/user.model');
const Membership = require('../families/membership.model');

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 10 || !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
    const error = new Error('La contraseña debe tener al menos 10 caracteres e incluir mayúscula, minúscula y número.');
    error.status = 400;
    throw error;
  }
  return value;
}

async function listFamilyAccounts(currentUser) {
  return Membership.find({ family: currentUser.familyId, isActive: true })
    .populate({ path: 'user', match: { isActive: true }, select: 'name username selectedAvatar' }).lean();
}

async function changeOwnPassword(currentUser, currentPassword, newPassword, confirmation) {
  if (newPassword !== confirmation) throw badRequest('La confirmación no coincide con la nueva contraseña.');
  validatePassword(newPassword);
  const user = await User.findById(currentUser.id).select('+passwordHash');
  if (!user || !(await bcrypt.compare(String(currentPassword || ''), user.passwordHash))) throw badRequest('La contraseña actual es incorrecta.');
  if (await bcrypt.compare(newPassword, user.passwordHash)) throw badRequest('La nueva contraseña debe ser diferente a la actual.');
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.mustChangePassword = false;
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();
  return user.sessionVersion;
}

async function resetFamilyPassword(currentUser, targetUserId, newPassword, confirmation) {
  if (currentUser.role !== 'admin_player') throw forbidden();
  if (newPassword !== confirmation) throw badRequest('La confirmación no coincide con la nueva contraseña.');
  validatePassword(newPassword);
  const membership = await Membership.findOne({ family: currentUser.familyId, user: targetUserId, isActive: true });
  if (!membership || membership.role === 'admin_player') throw badRequest('Selecciona una cuenta familiar válida.');
  const hash = await bcrypt.hash(newPassword, 12);
  const user = await User.findOneAndUpdate({ _id: targetUserId, isActive: true }, { $set: { passwordHash: hash }, $inc: { sessionVersion: 1 } });
  if (!user) throw badRequest('No se encontró la cuenta.');
}

async function updateAvatar(currentUser, avatar) {
  const allowed = ['nova', 'lumi', 'kai'];
  if (!allowed.includes(avatar)) throw badRequest('Selecciona un avatar válido.');
  await User.findByIdAndUpdate(currentUser.id, { selectedAvatar: avatar });
  return avatar;
}

async function updatePreferences(currentUser, input) {
  const allowed = {
    color: ['violet', 'pink', 'blue', 'mint', 'sunset'],
    mode: ['light', 'dark', 'auto'],
    decoration: ['stars', 'hearts', 'lightning', 'none']
  };
  const preferences = {
    color: String(input.color || ''), mode: String(input.mode || ''), decoration: String(input.decoration || '')
  };
  if (Object.entries(preferences).some(([key, value]) => !allowed[key].includes(value))) {
    throw badRequest('Selecciona preferencias válidas.');
  }
  await User.findByIdAndUpdate(currentUser.id, { $set: { preferences } }, { runValidators: true });
  return preferences;
}

function badRequest(message) { const error = new Error(message); error.status = 400; return error; }
function forbidden() { const error = new Error('No tienes permiso para realizar esta acción.'); error.status = 403; return error; }
module.exports = { listFamilyAccounts, changeOwnPassword, resetFamilyPassword, updateAvatar, updatePreferences, validatePassword };
