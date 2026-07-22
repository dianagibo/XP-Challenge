const bcrypt = require('bcryptjs');
const User = require('./user.model');
const Membership = require('../families/membership.model');
const { DEFAULTS, KEYS, effectivePermissions } = require('../families/permissions');
const { validatePassword } = require('../accounts/account.service');

const ROLES = ['player', 'validator', 'player_validator'];
function badRequest(message) { const error = new Error(message); error.status = 400; return error; }
function selectedPermissions(input, role) {
  const permissions = {};
  for (const key of KEYS) permissions[key] = input[key] === 'on';
  permissions.manageUsers = false;
  if (role === 'player' || role === 'player_validator') permissions.participate = true;
  if (role === 'validator') permissions.participate = false;
  return permissions;
}
async function list(currentUser) {
  const rows = await Membership.find({ family: currentUser.familyId }).populate({ path: 'user', select: 'name username selectedAvatar isActive lastLoginAt mustChangePassword createdAt' }).sort({ createdAt: 1 }).lean();
  return rows.filter((row) => row.user).map((row) => ({ ...row, permissions: effectivePermissions(row.role, row.permissions) }));
}
async function create(input, currentUser) {
  const name = String(input.name || '').trim();
  const username = String(input.username || '').trim().toLowerCase();
  if (!name || !/^[a-z0-9._-]{3,40}$/.test(username)) throw badRequest('Escribe un nombre y un usuario válido de al menos 3 caracteres.');
  if (!ROLES.includes(input.role)) throw badRequest('Selecciona un rol válido.');
  validatePassword(input.temporaryPassword);
  if (await User.exists({ username })) throw badRequest('Ese nombre de usuario ya está en uso.');
  const user = await User.create({ name, username, passwordHash: await bcrypt.hash(input.temporaryPassword, 12), mustChangePassword: true });
  try {
    await Membership.create({ user: user._id, family: currentUser.familyId, role: input.role, permissions: selectedPermissions(input, input.role) });
  } catch (error) { await User.deleteOne({ _id: user._id }); throw error; }
  return user;
}
async function update(userId, input, currentUser) {
  const membership = await Membership.findOne({ user: userId, family: currentUser.familyId });
  if (!membership || membership.role === 'admin_player') throw badRequest('No puedes modificar esa cuenta.');
  if (!ROLES.includes(input.role)) throw badRequest('Selecciona un rol válido.');
  const name = String(input.name || '').trim();
  if (!name) throw badRequest('El nombre es obligatorio.');
  await User.updateOne({ _id: userId }, { $set: { name } });
  membership.role = input.role;
  membership.permissions = selectedPermissions(input, input.role);
  membership.isActive = input.isActive === 'on';
  await membership.save();
  await User.updateOne({ _id: userId }, { $set: { isActive: membership.isActive }, $inc: { sessionVersion: 1 } });
}
async function resetPassword(userId, input, currentUser) {
  validatePassword(input.temporaryPassword);
  const membership = await Membership.findOne({ user: userId, family: currentUser.familyId });
  if (!membership || membership.role === 'admin_player') throw badRequest('No puedes restablecer esa cuenta.');
  await User.updateOne({ _id: userId }, { $set: { passwordHash: await bcrypt.hash(input.temporaryPassword, 12), mustChangePassword: true }, $inc: { sessionVersion: 1 } });
}
module.exports = { ROLES, KEYS, DEFAULTS, list, create, update, resetPassword };
