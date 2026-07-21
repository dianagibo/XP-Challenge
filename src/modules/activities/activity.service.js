const Activity = require('./activity.model');
const Membership = require('../families/membership.model');
const rewardService = require('../rewards/reward.service');

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

async function getPlayerActivity(activityId, currentUser) {
  if (!Activity.db.base.isValidObjectId(activityId)) throw notFoundError();

  const activity = await Activity.findOne({
    _id: activityId,
    family: currentUser.familyId,
    assignedTo: currentUser.id
  })
    .populate('validators', 'name')
    .lean();

  if (!activity) throw notFoundError();
  return activity;
}

async function submitForApproval(activityId, completionNote, currentUser) {
  if (!Activity.db.base.isValidObjectId(activityId)) throw notFoundError();

  const note = String(completionNote || '').trim();
  if (note.length > 500) throw validationError('Your note must be 500 characters or fewer.');

  const activity = await Activity.findOneAndUpdate({
    _id: activityId,
    family: currentUser.familyId,
    assignedTo: currentUser.id,
    status: { $in: ['assigned', 'changes_requested'] }
  }, {
    $set: {
      status: 'pending_validation',
      completionNote: note,
      submittedAt: new Date(),
      reviewNote: '',
      reviewedBy: null,
      reviewedAt: null
    }
  }, { new: true });

  if (activity) return activity;

  const existing = await Activity.findOne({
    _id: activityId,
    family: currentUser.familyId,
    assignedTo: currentUser.id
  }).select('status');

  if (!existing) throw notFoundError();
  throw validationError('This mission cannot be sent for approval in its current status.');
}

async function listReviewableActivities(currentUser) {
  return Activity.find({
    family: currentUser.familyId,
    validators: currentUser.id,
    status: 'pending_validation'
  })
    .populate('assignedTo', 'name username selectedAvatar')
    .sort({ submittedAt: 1 })
    .lean();
}

async function getReviewableActivity(activityId, currentUser) {
  if (!Activity.db.base.isValidObjectId(activityId)) throw notFoundError();
  const activity = await Activity.findOne({
    _id: activityId,
    family: currentUser.familyId,
    validators: currentUser.id,
    status: 'pending_validation'
  })
    .populate('assignedTo', 'name username selectedAvatar')
    .populate('validators', 'name')
    .lean();
  if (!activity) throw notFoundError();
  return activity;
}

async function reviewActivity(activityId, decision, reviewNote, currentUser) {
  if (!Activity.db.base.isValidObjectId(activityId)) throw notFoundError();
  if (!['approved', 'changes_requested'].includes(decision)) throw validationError('Select a valid review decision.');

  const note = String(reviewNote || '').trim();
  if (note.length > 500) throw validationError('Your feedback must be 500 characters or fewer.');
  if (decision === 'changes_requested' && !note) throw validationError('Feedback is required when requesting changes.');

  const session = await Activity.startSession();
  let reviewedActivity;
  try {
    await session.withTransaction(async () => {
      const activity = await Activity.findOne({
        _id: activityId,
        family: currentUser.familyId,
        validators: currentUser.id,
        status: 'pending_validation'
      }).session(session);
      if (!activity) throw notFoundError();

      activity.status = decision;
      activity.reviewNote = note;
      activity.reviewedBy = currentUser.id;
      activity.reviewedAt = new Date();

      if (decision === 'approved') {
        const transaction = await rewardService.grantMissionRewards(activity, currentUser.id, session);
        activity.rewardsGrantedAt = new Date();
        activity.rewardTransaction = transaction._id;
      }

      reviewedActivity = await activity.save({ session });
    });
    return reviewedActivity;
  } finally {
    await session.endSession();
  }
}

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function notFoundError() {
  const error = new Error('Mission not found.');
  error.status = 404;
  return error;
}

module.exports = {
  REWARDS,
  getFamilyMembers,
  createActivity,
  listManagedActivities,
  listPlayerActivities,
  getPlayerActivity,
  submitForApproval,
  listReviewableActivities,
  getReviewableActivity,
  reviewActivity
};
