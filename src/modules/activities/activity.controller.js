const activityService = require('./activity.service');

const CATEGORIES = [
  { value: 'home', label: 'Hogar' },
  { value: 'school', label: 'Colegio' },
  { value: 'wellbeing', label: 'Bienestar' },
  { value: 'personal_growth', label: 'Crecimiento personal' },
  { value: 'family', label: 'Familia' }
];

async function showCreate(request, response) {
  return renderCreate(response, request.session.user);
}

async function create(request, response, next) {
  try {
    await activityService.createActivity(request.body, request.session.user);
    request.session.flash = { type: 'success', message: '¡Misión creada y asignada!' };
    return response.redirect('/missions/manage');
  } catch (error) {
    if (error.status === 400 || error.name === 'ValidationError') {
      return renderCreate(response, request.session.user, request.body, error.message, 400);
    }
    return next(error);
  }
}

async function showManage(request, response, next) {
  try {
    const { activities, recurringMissions } = await activityService.listManagedActivities(request.session.user.familyId);
    const flash = request.session.flash;
    delete request.session.flash;
    return response.render('pages/manage-missions', {
      pageTitle: 'Administrar misiones', activePage: 'missions', activities, recurringMissions, flash
    });
  } catch (error) {
    return next(error);
  }
}

async function setRecurringActive(request, response, next) {
  try {
    await activityService.setRecurringMissionActive(
      request.params.seriesId, request.body.action === 'resume', request.session.user
    );
    request.session.flash = {
      type: 'success',
      message: request.body.action === 'resume' ? 'Serie reactivada.' : 'Serie pausada.'
    };
    return response.redirect('/missions/manage');
  } catch (error) { return next(error); }
}

async function showEditRecurring(request, response, next) {
  try {
    const series = await activityService.getRecurringMission(request.params.seriesId, request.session.user);
    if (series.endedAt) {
      request.session.flash = { type: 'error', message: 'Las series finalizadas se conservan como historial y no admiten cambios.' };
      return response.redirect('/missions/manage');
    }
    return renderRecurring(response, request.session.user, series);
  } catch (error) { return next(error); }
}

async function updateRecurring(request, response, next) {
  try {
    await activityService.updateRecurringMission(request.params.seriesId, request.body, request.session.user);
    request.session.flash = { type: 'success', message: request.body.updatePending === 'yes' ? 'Serie y próximas misiones pendientes actualizadas.' : 'Serie actualizada. Las misiones ya generadas conservaron sus datos.' };
    return response.redirect('/missions/manage');
  } catch (error) {
    if (error.status === 400 || error.name === 'ValidationError') return renderRecurring(response, request.session.user, { ...request.body, _id: request.params.seriesId }, error.message, 400);
    return next(error);
  }
}

async function endRecurring(request, response, next) {
  try {
    await activityService.endRecurringMission(request.params.seriesId, request.session.user);
    request.session.flash = { type: 'success', message: 'Serie finalizada. Su historial completado permanece intacto.' };
    return response.redirect('/missions/manage');
  } catch (error) {
    if (error.status === 400) { request.session.flash = { type: 'error', message: error.message }; return response.redirect('/missions/manage'); }
    return next(error);
  }
}

async function showEdit(request, response, next) {
  try {
    const activity = await activityService.getManagedActivity(request.params.activityId, request.session.user);
    if (!['assigned', 'changes_requested'].includes(activity.status)) {
      request.session.flash = { type: 'error', message: 'Esta misión ya no admite edición.' };
      return response.redirect('/missions/manage');
    }
    activity.dueDate = new Date(activity.dueDate).toISOString().slice(0, 10);
    return renderEdit(response, request.session.user, activity);
  } catch (error) { return next(error); }
}
async function update(request, response, next) {
  try {
    await activityService.updateActivity(request.params.activityId, request.body, request.session.user);
    request.session.flash = { type: 'success', message: 'Misión actualizada correctamente.' };
    return response.redirect('/missions/manage');
  } catch (error) {
    if (error.status === 400 || error.name === 'ValidationError') return renderEdit(response, request.session.user, { ...request.body, _id: request.params.activityId }, error.message, 400);
    return next(error);
  }
}
async function cancel(request, response, next) {
  try { await activityService.cancelActivity(request.params.activityId, request.session.user); request.session.flash = { type: 'success', message: 'Misión cancelada. No se modificaron XP, monedas ni historial.' }; return response.redirect('/missions/manage'); }
  catch (error) { if (error.status === 400) { request.session.flash = { type: 'error', message: error.message }; return response.redirect('/missions/manage'); } return next(error); }
}
async function archive(request, response, next) {
  try { await activityService.archiveActivity(request.params.activityId, request.session.user); request.session.flash = { type: 'success', message: 'Misión archivada.' }; return response.redirect('/missions/manage'); }
  catch (error) { if (error.status === 400) { request.session.flash = { type: 'error', message: error.message }; return response.redirect('/missions/manage'); } return next(error); }
}
async function showArchive(request, response, next) {
  try { const activities = await activityService.listArchivedActivities(request.session.user.familyId); return response.render('pages/mission-archive', { pageTitle: 'Historial archivado', activePage: 'missions', activities }); }
  catch (error) { return next(error); }
}

async function showDetails(request, response, next) {
  try {
    const activity = await activityService.getPlayerActivity(request.params.activityId, request.session.user);
    return response.render('pages/mission-details', {
      pageTitle: activity.title,
      activePage: 'missions',
      activity,
      error: null,
      values: {}
    });
  } catch (error) {
    return next(error);
  }
}

async function submitForApproval(request, response, next) {
  try {
    await activityService.submitForApproval(
      request.params.activityId,
      request.body.completionNote,
      request.session.user
    );
    request.session.flash = { type: 'success', message: '¡Misión enviada para aprobación!' };
    return response.redirect('/');
  } catch (error) {
    if (error.status === 400) {
      try {
        const activity = await activityService.getPlayerActivity(request.params.activityId, request.session.user);
        return response.status(400).render('pages/mission-details', {
          pageTitle: activity.title,
          activePage: 'missions',
          activity,
          error: error.message,
          values: request.body
        });
      } catch (lookupError) {
        return next(lookupError);
      }
    }
    return next(error);
  }
}

async function showReviewQueue(request, response, next) {
  try {
    const activities = await activityService.listReviewableActivities(request.session.user);
    const flash = request.session.flash;
    delete request.session.flash;
    return response.render('pages/review-missions', {
      pageTitle: 'Revisar misiones', activePage: 'reviews', activities, flash
    });
  } catch (error) { return next(error); }
}

async function showReviewDetails(request, response, next) {
  try {
    const activity = await activityService.getReviewableActivity(request.params.activityId, request.session.user);
    return response.render('pages/review-mission-details', {
      pageTitle: `Revisar ${activity.title}`, activePage: 'reviews', activity, error: null, values: {}
    });
  } catch (error) { return next(error); }
}

async function review(request, response, next) {
  try {
    await activityService.reviewActivity(
      request.params.activityId, request.body.decision, request.body.reviewNote, request.session.user
    );
    request.session.flash = {
      type: 'success',
      message: request.body.decision === 'approved'
        ? '¡Misión aprobada! Sofi recibió sus XP y monedas.'
        : 'Se solicitaron ajustes a Sofi.'
    };
    return response.redirect('/missions/review');
  } catch (error) {
    if (error.status === 400) {
      try {
        const activity = await activityService.getReviewableActivity(request.params.activityId, request.session.user);
        return response.status(400).render('pages/review-mission-details', {
          pageTitle: `Revisar ${activity.title}`, activePage: 'reviews', activity,
          error: error.message, values: request.body
        });
      } catch (lookupError) { return next(lookupError); }
    }
    return next(error);
  }
}

async function renderCreate(response, currentUser, values = {}, error = null, status = 200) {
  const members = await activityService.getFamilyMembers(currentUser.familyId);
  return response.status(status).render('pages/create-mission', {
    pageTitle: 'Crear misión', activePage: 'missions', values, error,
    rewards: activityService.REWARDS, categories: CATEGORIES,
    players: members.filter((item) => item.role === 'player'),
    validators: members.filter((item) => ['admin_player', 'validator'].includes(item.role)),
    minimumDate: new Date().toISOString().slice(0, 10)
  });
}

async function renderEdit(response, currentUser, values, error = null, status = 200) {
  const members = await activityService.getFamilyMembers(currentUser.familyId);
  return response.status(status).render('pages/edit-mission', {
    pageTitle: 'Editar misión', activePage: 'missions', values, error,
    rewards: activityService.REWARDS, categories: CATEGORIES,
    validators: members.filter((item) => ['admin_player', 'validator'].includes(item.role)),
    minimumDate: new Date().toISOString().slice(0, 10)
  });
}

async function renderRecurring(response, currentUser, values, error = null, status = 200) {
  const members = await activityService.getFamilyMembers(currentUser.familyId);
  return response.status(status).render('pages/edit-recurring-mission', {
    pageTitle: 'Editar serie recurrente', activePage: 'missions', values, error,
    rewards: activityService.REWARDS, categories: CATEGORIES,
    validators: members.filter((item) => ['admin_player', 'validator'].includes(item.role))
  });
}

module.exports = {
  showCreate, create, showManage, showDetails, submitForApproval,
  showReviewQueue, showReviewDetails, review, setRecurringActive,
  showEdit, update, cancel, archive, showArchive,
  showEditRecurring, updateRecurring, endRecurring
};
