const Activity = require('./activity.model');
const Membership = require('../families/membership.model');

const REWARDS = Object.freeze({
  easy: { xp: 10, coins: 2 },
  medium: { xp: 25, coins: 5 },
  hard: { xp: 50, coins: 10 },
  epic: { xp: 100, coins: 20 }
});

async function getFamilyMembers(familyId) {
  const memberships = await Membership.find({ family: familyId, isActive: true })
    .populate({ path: 'user', match: { isActive: true }, select: 'name username selectedAvatar' })
    .lean();

  return memberships.filter((membership) => membership.user);
}

async function createActivity(input, currentUser) {
  const members = await getFamilyMembers(currentUser.familyId);
  const assignableIds = new Set(members.filter((item) => item.role === 'player').map((item) => String(item.user._id)));
  const validatorIds = new Set(members.filter((item) => ['admin_player', 'validator'].includes(item.role)).map((item) => String(item.user._id)));
  const selectedValidators = [...new Set([input.validators].flat().filter(Boolean))];

  if (!assignableIds.has(String(input.assignedTo))) throw validationError('Select a valid player.');
  if (!selectedValidators.length || selectedValidators.some((id) => !validatorIds.has(String(id)))) {
    throw validationError('Select at least one valid validator.');
  }
  if (!REWARDS[input.difficulty]) throw validationError('Select a valid difficulty.');

  const dueDate = new Date(`${input.dueDate}T23:59:59`);
  if (!input.dueDate || Number.isNaN(dueDate.getTime()) || dueDate < new Date()) {
    throw validationError('Due date must be today or later.');
  }

  return Activity.create({
    family: currentUser.familyId,
    title: input.title,
    description: input.description,
    category: input.category,
    difficulty: input.difficulty,
    xpReward: input.xpReward,
    coinReward: input.coinReward,
    dueDate,
    instructions: input.instructions,
    assignedTo: input.assignedTo,
    validators: selectedValidators,
    createdBy: currentUser.id
  });
}

async function listManagedActivities(familyId) {
  return Activity.find({ family: familyId })
    .populate('assignedTo', 'name username selectedAvatar')
    .populate('validators', 'name')
    .sort({ createdAt: -1 })
    .lean();
}

async function listPlayerActivities(userId, familyId) {
  return Activity.find({ family: familyId, assignedTo: userId })
    .sort({ dueDate: 1, createdAt: -1 })
    .lean();
}

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

module.exports = { REWARDS, getFamilyMembers, createActivity, listManagedActivities, listPlayerActivities };
