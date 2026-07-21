const Activity = require('./activity.model');
const RecurringMission = require('./recurring-mission.model');
const Membership = require('../families/membership.model');
const rewardService = require('../rewards/reward.service');
const weeklyGoalService = require('../goals/weekly-goal.service');

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

  const frequency = ['once', 'daily', 'weekly'].includes(input.frequency) ? input.frequency : 'once';
  const startDate = input.startDate || input.dueDate;
  validateDateRange(startDate, input.endDate);

  const weekdays = [...new Set([input.weekdays].flat().filter((value) => value !== undefined).map(Number))];
  if (frequency === 'weekly' && (!weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6))) {
    throw validationError('Choose at least one valid day for a weekly mission.');
  }

  const common = {
    family: currentUser.familyId, title: input.title, description: input.description,
    category: input.category, difficulty: input.difficulty,
    xpReward: input.xpReward, coinReward: input.coinReward,
    instructions: input.instructions, assignedTo: input.assignedTo,
    validators: selectedValidators, createdBy: currentUser.id
  };

  if (frequency !== 'once') {
    const series = await RecurringMission.create({
      ...common, frequency, weekdays: frequency === 'weekly' ? weekdays : [],
      startDate, endDate: input.endDate || null
    });
    await materializeSeries(series);
    return series;
  }

  const dueDate = endOfDay(startDate);

  return Activity.create({
    ...common,
    dueDate,
  });
}

async function listManagedActivities(familyId) {
  await materializeActiveSeries(familyId);
  const [activities, recurringMissions] = await Promise.all([Activity.find({ family: familyId })
    .populate('assignedTo', 'name username selectedAvatar')
    .populate('validators', 'name')
    .sort({ createdAt: -1 })
    .lean(), RecurringMission.find({ family: familyId })
      .populate('assignedTo', 'name username selectedAvatar')
      .sort({ createdAt: -1 }).lean()]);
  return { activities, recurringMissions };
}

async function listPlayerActivities(userId, familyId) {
  await materializeActiveSeries(familyId);
  return Activity.find({ family: familyId, assignedTo: userId })
    .sort({ dueDate: 1, createdAt: -1 })
    .lean();
}

async function setRecurringMissionActive(seriesId, isActive, currentUser) {
  if (!Activity.db.base.isValidObjectId(seriesId)) throw notFoundError();
  const series = await RecurringMission.findOneAndUpdate(
    { _id: seriesId, family: currentUser.familyId },
    { $set: { isActive } }, { new: true }
  );
  if (!series) throw notFoundError();
  if (isActive) {
    await materializeSeries(series);
  } else {
    await Activity.deleteMany({
      recurringMission: series._id,
      occurrenceDate: { $gte: localDateString(new Date()) },
      status: 'assigned'
    });
  }
  return series;
}

async function materializeActiveSeries(familyId) {
  const series = await RecurringMission.find({ family: familyId, isActive: true });
  await Promise.all(series.map(materializeSeries));
}

async function materializeSeries(series) {
  if (!series.isActive) return;
  const today = localDateString(new Date());
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 14);
  const until = series.endDate && series.endDate < localDateString(horizon)
    ? series.endDate : localDateString(horizon);
  const start = series.startDate;
  if (start > until) return;

  const occurrences = [];
  for (let cursor = fromDateString(start); localDateString(cursor) <= until; cursor.setDate(cursor.getDate() + 1)) {
    const occurrenceDate = localDateString(cursor);
    if (series.frequency === 'weekly' && !series.weekdays.includes(cursor.getDay())) continue;
    occurrences.push({
      updateOne: {
        filter: { recurringMission: series._id, occurrenceDate },
        update: { $setOnInsert: {
          family: series.family, title: series.title, description: series.description,
          category: series.category, difficulty: series.difficulty,
          xpReward: series.xpReward, coinReward: series.coinReward,
          instructions: series.instructions, assignedTo: series.assignedTo,
          validators: series.validators, createdBy: series.createdBy,
          dueDate: endOfDay(occurrenceDate), recurringMission: series._id, occurrenceDate
        } }, upsert: true
      }
    });
  }
  if (occurrences.length) await Activity.bulkWrite(occurrences, { ordered: false });
}

function validateDateRange(startDate, endDate) {
  const today = localDateString(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate || '')) || startDate < today) {
    throw validationError('Start date must be today or later.');
  }
  if (endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate)) {
    throw validationError('End date must be on or after the start date.');
  }
}

function fromDateString(value) { return new Date(`${value}T12:00:00`); }
function endOfDay(value) { return new Date(`${value}T23:59:59`); }
function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
        await weeklyGoalService.applyApprovedMission(activity, session);
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
  reviewActivity,
  setRecurringMissionActive
};
