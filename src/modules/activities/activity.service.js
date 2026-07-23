const Activity = require('./activity.model');
const RecurringMission = require('./recurring-mission.model');
const Membership = require('../families/membership.model');
const rewardService = require('../rewards/reward.service');
const weeklyGoalService = require('../goals/weekly-goal.service');
const streakService = require('../progress/streak.service');
const notificationService = require('../notifications/notification.service');
const { effectivePermissions } = require('../families/permissions');

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

  return memberships.filter((membership) => membership.user).map((membership) => ({ ...membership, permissions: effectivePermissions(membership.role, membership.permissions) }));
}

async function createActivity(input, currentUser) {
  const members = await getFamilyMembers(currentUser.familyId);
  const isSharedChallenge = !currentUser.permissions?.manageUsers;
  const assignableIds = new Set(members.filter((item) => item.permissions.participate && String(item.user._id) !== String(currentUser.id)).map((item) => String(item.user._id)));
  const validatorIds = new Set(members.filter((item) => item.permissions.validateResponsibilities || item.permissions.reviewOwnMissions).map((item) => String(item.user._id)));
  const selectedValidators = isSharedChallenge ? [currentUser.id] : [...new Set([input.validators].flat().filter(Boolean))];

  if (!assignableIds.has(String(input.assignedTo))) throw validationError('Selecciona un participante válido distinto de ti.');
  if (!isSharedChallenge && (!selectedValidators.length || selectedValidators.some((id) => !validatorIds.has(String(id))))) {
    throw validationError('Selecciona al menos una persona válida para revisar.');
  }
  if (!REWARDS[input.difficulty]) throw validationError('Selecciona una dificultad válida.');
  if (isSharedChallenge && input.difficulty === 'epic') throw validationError('Selecciona una dificultad disponible para retos familiares.');

  // Shared challenges always use the fixed reward for the selected difficulty.
  // This prevents a player from changing the submitted XP or coin values.
  const reward = isSharedChallenge
    ? REWARDS[input.difficulty]
    : { xp: input.xpReward, coins: input.coinReward };

  const frequency = ['once', 'daily', 'weekly'].includes(input.frequency) ? input.frequency : 'once';
  const startDate = input.startDate || input.dueDate;
  validateDateRange(startDate, input.endDate);

  const weekdays = [...new Set([input.weekdays].flat().filter((value) => value !== undefined).map(Number))];
  if (frequency === 'weekly' && (!weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6))) {
    throw validationError('Elige al menos un día válido para la misión semanal.');
  }

  const common = {
    family: currentUser.familyId, title: input.title, description: input.description,
    category: input.category, difficulty: input.difficulty,
    xpReward: reward.xp, coinReward: reward.coins,
    instructions: input.instructions, assignedTo: input.assignedTo,
    validators: selectedValidators, createdBy: currentUser.id
  };

  if (isSharedChallenge && frequency !== 'once') throw validationError('Por ahora los retos compartidos se crean una vez.');
  if (frequency !== 'once') {
    const series = await RecurringMission.create({
      ...common, frequency, weekdays: frequency === 'weekly' ? weekdays : [],
      startDate, endDate: input.endDate || null
    });
    await materializeSeries(series);
    await notificationService.createForRecipients({
      family: currentUser.familyId, recipients: [input.assignedTo], type: 'mission_assigned',
      title: 'Nueva serie de misiones', message: `Te asignaron la serie “${series.title}”.`,
      url: '/#missions', eventKey: `recurring-series:${series._id}:assigned`
    });
    return series;
  }

  const dueDate = endOfDay(startDate);

  const activity = await Activity.create({
    ...common,
    dueDate, status: isSharedChallenge ? 'pending_acceptance' : 'assigned'
  });
  await notificationService.createForRecipients({
    family: currentUser.familyId, recipients: [input.assignedTo], type: 'mission_assigned',
      title: isSharedChallenge ? '¡Te enviaron un reto!' : '¡Tienes una nueva misión!', message: isSharedChallenge ? `${currentUser.name} quiere retarte con “${activity.title}”.` : `Te asignaron “${activity.title}”.`,
    url: `/missions/${activity._id}`, eventKey: `mission:${activity._id}:assigned`
  });
  return activity;
}

async function listManagedActivities(familyId, currentUser = null) {
  await materializeActiveSeries(familyId);
  const activityFilter = { family: familyId, archivedAt: null };
  if (!currentUser?.permissions?.manageUsers) activityFilter.createdBy = currentUser.id;
  const seriesFilter = { family: familyId };
  if (!currentUser?.permissions?.manageUsers) seriesFilter.createdBy = currentUser.id;
  const [activities, recurringMissions] = await Promise.all([Activity.find(activityFilter)
    .populate('assignedTo', 'name username selectedAvatar')
    .populate('validators', 'name')
    .sort({ createdAt: -1 })
    .lean(), RecurringMission.find(seriesFilter)
      .populate('assignedTo', 'name username selectedAvatar')
      .sort({ createdAt: -1 }).lean()]);
  return {
    activities,
    recurringMissions: recurringMissions.map((series) => ({
      ...series,
      nextOccurrence: getNextOccurrence(series)
    }))
  };
}

function getNextOccurrence(series) {
  if (!series.isActive || series.endedAt) return null;
  const today = localDateString(new Date());
  const firstDate = series.startDate > today ? series.startDate : today;
  for (let cursor = fromDateString(firstDate), days = 0; days <= 366; cursor.setDate(cursor.getDate() + 1), days += 1) {
    const date = localDateString(cursor);
    if (series.endDate && date > series.endDate) return null;
    if (series.frequency === 'daily' || series.weekdays.includes(cursor.getDay())) return date;
  }
  return null;
}

async function listPlayerActivities(userId, familyId) {
  await materializeActiveSeries(familyId);
  return Activity.find({ family: familyId, assignedTo: userId, archivedAt: null, status: { $ne: 'canceled' } })
    .sort({ dueDate: 1, createdAt: -1 })
    .lean();
}

async function setRecurringMissionActive(seriesId, isActive, currentUser) {
  if (!Activity.db.base.isValidObjectId(seriesId)) throw notFoundError();
  const series = await RecurringMission.findOneAndUpdate(
    { _id: seriesId, family: currentUser.familyId, endedAt: null },
    { $set: { isActive } }, { new: true }
  );
  if (!series) throw validationError('Esta serie fue finalizada o ya no está disponible.');
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

async function getRecurringMission(seriesId, currentUser) {
  if (!Activity.db.base.isValidObjectId(seriesId)) throw notFoundError();
  const series = await RecurringMission.findOne({ _id: seriesId, family: currentUser.familyId }).lean();
  if (!series) throw notFoundError();
  return series;
}

async function updateRecurringMission(seriesId, input, currentUser) {
  const existing = await getRecurringMission(seriesId, currentUser);
  if (existing.endedAt) throw validationError('Una serie finalizada se conserva como historial y ya no puede editarse.');

  const members = await getFamilyMembers(currentUser.familyId);
  const validatorIds = new Set(members.filter((item) => ['admin_player', 'validator'].includes(item.role)).map((item) => String(item.user._id)));
  const selectedValidators = [...new Set([input.validators].flat().filter(Boolean))];
  if (!selectedValidators.length || selectedValidators.some((id) => !validatorIds.has(String(id)))) throw validationError('Selecciona al menos una persona válida para revisar.');
  if (!REWARDS[input.difficulty]) throw validationError('Selecciona una dificultad válida.');
  const frequency = ['daily', 'weekly'].includes(input.frequency) ? input.frequency : null;
  if (!frequency) throw validationError('Selecciona una frecuencia válida.');
  const weekdays = [...new Set([input.weekdays].flat().filter((value) => value !== undefined).map(Number))];
  if (frequency === 'weekly' && (!weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6))) {
    throw validationError('Elige al menos un día válido para la misión semanal.');
  }
  validateSeriesDateRange(input.startDate, input.endDate);

  const changes = {
    title: input.title, description: input.description, category: input.category,
    difficulty: input.difficulty, xpReward: Number(input.xpReward), coinReward: Number(input.coinReward),
    instructions: input.instructions || '', validators: selectedValidators, frequency,
    weekdays: frequency === 'weekly' ? weekdays : [], startDate: input.startDate,
    endDate: input.endDate || null
  };
  const series = await RecurringMission.findOneAndUpdate(
    { _id: seriesId, family: currentUser.familyId, endedAt: null }, { $set: changes },
    { new: true, runValidators: true }
  );
  if (!series) throw validationError('La serie ya no puede editarse.');

  if (input.updatePending === 'yes') {
    await Activity.deleteMany({
      recurringMission: series._id, occurrenceDate: { $gte: localDateString(new Date()) }, status: 'assigned'
    });
  }
  await materializeSeries(series);
  return series;
}

async function endRecurringMission(seriesId, currentUser) {
  if (!Activity.db.base.isValidObjectId(seriesId)) throw notFoundError();
  const series = await RecurringMission.findOneAndUpdate(
    { _id: seriesId, family: currentUser.familyId, endedAt: null },
    { $set: { isActive: false, endedAt: new Date(), endedBy: currentUser.id } }, { new: true }
  );
  if (!series) throw validationError('Esta serie ya fue finalizada o no está disponible.');
  await Activity.deleteMany({
    recurringMission: series._id, occurrenceDate: { $gte: localDateString(new Date()) }, status: 'assigned'
  });
  return series;
}

async function materializeActiveSeries(familyId) {
  const series = await RecurringMission.find({ family: familyId, isActive: true, endedAt: null });
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
    throw validationError('La fecha de inicio debe ser hoy o posterior.');
  }
  if (endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate)) {
    throw validationError('La fecha final debe ser igual o posterior a la fecha de inicio.');
  }
}

function validateSeriesDateRange(startDate, endDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate || ''))) {
    throw validationError('Selecciona una fecha de inicio válida.');
  }
  if (endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate)) {
    throw validationError('La fecha final debe ser igual o posterior a la fecha de inicio.');
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
  if (note.length > 500) throw validationError('Tu nota debe tener máximo 500 caracteres.');

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

  if (activity) {
    await notificationService.createForRecipients({
      family: activity.family, recipients: activity.validators, type: 'mission_submitted',
      title: 'Misión lista para revisar', message: `${currentUser.name} envió “${activity.title}” para aprobación.`,
      url: `/missions/review/${activity._id}`, eventKey: `mission:${activity._id}:submitted:${activity.submittedAt.getTime()}`
    });
    return activity;
  }

  const existing = await Activity.findOne({
    _id: activityId,
    family: currentUser.familyId,
    assignedTo: currentUser.id
  }).select('status');

  if (!existing) throw notFoundError();
  throw validationError('Esta misión no puede enviarse para aprobación en su estado actual.');
}

async function respondToSharedMission(activityId, decision, note, currentUser) {
  if (!Activity.db.base.isValidObjectId(activityId)) throw notFoundError();
  const message = String(note || '').trim();
  if (message.length > 500) throw validationError('Tu mensaje debe tener máximo 500 caracteres.');
  if (decision === 'return' && !message) throw validationError('Cuéntale a Sofi por qué quieres devolver el reto.');
  const update = decision === 'accept'
    ? { status: 'assigned', acceptedAt: new Date(), acceptanceNote: '' }
    : { status: 'canceled', canceledAt: new Date(), canceledBy: currentUser.id, acceptanceNote: message };
  const activity = await Activity.findOneAndUpdate({ _id: activityId, family: currentUser.familyId, assignedTo: currentUser.id, status: 'pending_acceptance' }, { $set: update }, { new: true });
  if (!activity) throw validationError('Este reto ya fue respondido o no está disponible.');
  await notificationService.createForRecipients({
    family: activity.family, recipients: [activity.createdBy], type: decision === 'accept' ? 'mission_accepted' : 'mission_returned',
    title: decision === 'accept' ? '¡Diana aceptó tu reto!' : 'Diana devolvió tu reto',
    message: decision === 'accept' ? `Diana aceptó “${activity.title}”.` : message,
    url: decision === 'accept' ? `/missions/manage` : `/missions/manage`, eventKey: `mission:${activity._id}:${decision}`
  });
  return activity;
}

async function listReviewableActivities(currentUser) {
  return Activity.find({
    family: currentUser.familyId,
    validators: currentUser.id,
    status: 'pending_validation', archivedAt: null
  })
    .populate('assignedTo', 'name username selectedAvatar')
    .sort({ submittedAt: 1 })
    .lean();
}

async function getManagedActivity(activityId, currentUser) {
  if (!Activity.db.base.isValidObjectId(activityId)) throw notFoundError();
  const activity = await Activity.findOne({ _id: activityId, family: currentUser.familyId, archivedAt: null }).lean();
  if (!activity) throw notFoundError();
  return activity;
}

async function updateActivity(activityId, input, currentUser) {
  const existing = await getManagedActivity(activityId, currentUser);
  if (!['assigned', 'changes_requested'].includes(existing.status)) {
    throw validationError('Solo puedes editar una misión asignada o devuelta para ajustes.');
  }
  const members = await getFamilyMembers(currentUser.familyId);
  const validatorIds = new Set(members.filter((item) => ['admin_player', 'validator'].includes(item.role)).map((item) => String(item.user._id)));
  const selectedValidators = [...new Set([input.validators].flat().filter(Boolean))];
  if (!selectedValidators.length || selectedValidators.some((id) => !validatorIds.has(String(id)))) throw validationError('Selecciona al menos una persona válida para revisar.');
  if (!REWARDS[input.difficulty]) throw validationError('Selecciona una dificultad válida.');
  validateDateRange(input.dueDate);
  return Activity.findOneAndUpdate({ _id: activityId, family: currentUser.familyId, status: existing.status, archivedAt: null }, { $set: {
    title: input.title, description: input.description, category: input.category, difficulty: input.difficulty,
    xpReward: Number(input.xpReward), coinReward: Number(input.coinReward), instructions: input.instructions || '',
    validators: selectedValidators, dueDate: endOfDay(input.dueDate)
  } }, { new: true, runValidators: true });
}

async function cancelActivity(activityId, currentUser) {
  if (!Activity.db.base.isValidObjectId(activityId)) throw notFoundError();
  const activity = await Activity.findOneAndUpdate({ _id: activityId, family: currentUser.familyId, status: { $in: ['assigned', 'changes_requested', 'pending_validation'] }, archivedAt: null }, { $set: { status: 'canceled', canceledAt: new Date(), canceledBy: currentUser.id } }, { new: true });
  if (!activity) throw validationError('Esta misión ya no puede cancelarse. Las aprobadas se conservan como historial.');
  return activity;
}

async function archiveActivity(activityId, currentUser) {
  if (!Activity.db.base.isValidObjectId(activityId)) throw notFoundError();
  const activity = await Activity.findOneAndUpdate({ _id: activityId, family: currentUser.familyId, status: { $in: ['approved', 'canceled'] }, archivedAt: null }, { $set: { archivedAt: new Date(), archivedBy: currentUser.id } }, { new: true });
  if (!activity) throw validationError('Solo puedes archivar misiones aprobadas o canceladas.');
  return activity;
}

async function listArchivedActivities(familyId) {
  return Activity.find({ family: familyId, archivedAt: { $ne: null } }).populate('assignedTo', 'name').populate('validators', 'name').sort({ archivedAt: -1 }).lean();
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
  if (!['approved', 'changes_requested'].includes(decision)) throw validationError('Selecciona una decisión válida.');

  const note = String(reviewNote || '').trim();
  if (note.length > 500) throw validationError('Tus comentarios deben tener máximo 500 caracteres.');
  if (decision === 'changes_requested' && !note) throw validationError('Debes escribir un comentario cuando solicites ajustes.');

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
        await streakService.applyApprovedMission(activity, currentUser.id, session);
      }

      reviewedActivity = await activity.save({ session });
      await notificationService.createForRecipients({
        family: activity.family, recipients: [activity.assignedTo],
        type: decision === 'approved' ? 'mission_approved' : 'mission_changes_requested',
        title: decision === 'approved' ? '¡Misión aprobada!' : 'Tu misión necesita ajustes',
        message: decision === 'approved'
          ? `Aprobaron “${activity.title}” y recibiste ${activity.xpReward} XP y ${activity.coinReward} monedas.`
          : `Revisa los comentarios de “${activity.title}” y vuelve a intentarlo.`,
        url: `/missions/${activity._id}`,
        eventKey: `mission:${activity._id}:review:${activity.reviewedAt.getTime()}`
      }, session);
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
  respondToSharedMission,
  submitForApproval,
  listReviewableActivities,
  getReviewableActivity,
  reviewActivity,
  setRecurringMissionActive,
  getRecurringMission, updateRecurringMission, endRecurringMission,
  getManagedActivity, updateActivity, cancelActivity, archiveActivity, listArchivedActivities
};
