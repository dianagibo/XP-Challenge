const activityService = require('./activity.service');

const CATEGORIES = [
  { value: 'home', label: 'Home' },
  { value: 'school', label: 'School' },
  { value: 'wellbeing', label: 'Wellbeing' },
  { value: 'personal_growth', label: 'Personal growth' },
  { value: 'family', label: 'Family' }
];

async function showCreate(request, response) {
  return renderCreate(response, request.session.user);
}

async function create(request, response, next) {
  try {
    await activityService.createActivity(request.body, request.session.user);
    request.session.flash = { type: 'success', message: 'Mission created and assigned!' };
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
    const activities = await activityService.listManagedActivities(request.session.user.familyId);
    const flash = request.session.flash;
    delete request.session.flash;
    return response.render('pages/manage-missions', {
      pageTitle: 'Manage missions', activePage: 'missions', activities, flash
    });
  } catch (error) {
    return next(error);
  }
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
    request.session.flash = { type: 'success', message: 'Mission sent for approval!' };
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

async function renderCreate(response, currentUser, values = {}, error = null, status = 200) {
  const members = await activityService.getFamilyMembers(currentUser.familyId);
  return response.status(status).render('pages/create-mission', {
    pageTitle: 'Create mission', activePage: 'missions', values, error,
    rewards: activityService.REWARDS, categories: CATEGORIES,
    players: members.filter((item) => item.role === 'player'),
    validators: members.filter((item) => ['admin_player', 'validator'].includes(item.role)),
    minimumDate: new Date().toISOString().slice(0, 10)
  });
}

module.exports = { showCreate, create, showManage, showDetails, submitForApproval };
