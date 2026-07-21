const demoGame = require('../data/demo-game');
const activityService = require('../modules/activities/activity.service');

async function showDashboard(request, response, next) {
  if (request.session.user.role === 'validator') {
    return response.render('pages/validator-home', {
      pageTitle: 'Validation center',
      activePage: 'home'
    });
  }
  try {
    const game = structuredClone(demoGame);
    game.player.name = request.session.user.name;
    game.player.avatar = request.session.user.avatar || game.player.avatar;
    const activities = request.session.user.role === 'player'
      ? await activityService.listPlayerActivities(request.session.user.id, request.session.user.familyId)
      : await activityService.listManagedActivities(request.session.user.familyId);
    return response.render('pages/dashboard', {
      pageTitle: 'My adventure', activePage: 'home', game, activities,
      canManageMissions: request.session.user.role === 'admin_player'
    });
  } catch (error) {
    return next(error);
  }
}

function showAvatars(request, response) {
  const game = structuredClone(demoGame);
  game.player.name = request.session.user.name;
  game.player.avatar = request.session.user.avatar || game.player.avatar;
  response.render('pages/avatars', {
    pageTitle: 'Choose your avatar',
    activePage: 'profile',
    game
  });
}

module.exports = {
  showDashboard,
  showAvatars
};
