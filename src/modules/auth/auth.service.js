const bcrypt = require('bcryptjs');
const User = require('../users/user.model');
const Membership = require('../families/membership.model');
const Family = require('../families/family.model');

async function authenticate(username, password) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const user = await User.findOne({ username: normalizedUsername, isActive: true }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) return null;

  const membership = await Membership.findOne({ user: user._id, isActive: true }).populate('family');
  if (!membership || !membership.family?.isActive) return null;

  user.lastLoginAt = new Date();
  await user.save();

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    avatar: user.selectedAvatar,
    role: membership.role,
    familyId: membership.family.id,
    familyName: membership.family.name
    ,sessionVersion: user.sessionVersion || 0
  };
}

module.exports = { authenticate };
