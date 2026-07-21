const demoGame = require('../data/demo-game');
const activityService = require('../modules/activities/activity.service');
const rewardService = require('../modules/rewards/reward.service');

async function showDashboard(request, response, next) {
  if (request.session.user.role === 'validator') {
    try {
      const activities = await activityService.listReviewableActivities(request.session.user);
      const flash = request.session.flash;
      delete request.session.flash;
      return response.render('pages/validator-home', {
        pageTitle: 'Validation center', activePage: 'home', activities, flash
      });
    } catch (error) { return next(error); }
  }
  try {
    const game = structuredClone(demoGame);
    game.player.name = request.session.user.name;
    game.player.avatar = request.session.user.avatar || game.player.avatar;
    const rewards = await rewardService.getPlayerRewards(request.session.user.id);
    Object.assign(game.player, rewards);
    const activities = request.session.user.role === 'player'
      ? await activityService.listPlayerActivities(request.session.user.id, request.session.user.familyId)
      : await activityService.listManagedActivities(request.session.user.familyId);
    const flash = request.session.flash;
    delete request.session.flash;
    return response.render('pages/dashboard', {
      pageTitle: 'My adventure', activePage: 'home', game, activities,
      canManageMissions: request.session.user.role === 'admin_player', flash
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

async function showRewards(request, response, next) {
  try {
    const [rewards, transactions] = await Promise.all([
      rewardService.getPlayerRewards(request.session.user.id),
      rewardService.listPlayerTransactions(request.session.user.id, request.session.user.familyId)
    ]);
    return response.render('pages/rewards', {
      pageTitle: 'My rewards', activePage: 'rewards', rewards, transactions
    });
  } catch (error) { return next(error); }
}

module.exports = {
  showDashboard,
  showAvatars,
  showRewards
};
