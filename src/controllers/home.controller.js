const demoGame = require('../data/demo-game');
const activityService = require('../modules/activities/activity.service');
const rewardService = require('../modules/rewards/reward.service');
const progressService = require('../modules/progress/progress.service');
const weeklyGoalService = require('../modules/goals/weekly-goal.service');

async function showDashboard(request, response, next) {
  if (request.session.user.role === 'validator') {
    try {
      const activities = await activityService.listReviewableActivities(request.session.user);
      const flash = request.session.flash;
      delete request.session.flash;
      return response.render('pages/validator-home', {
        pageTitle: 'Centro de validación', activePage: 'home', activities, flash
      });
    } catch (error) { return next(error); }
  }
  try {
    const game = structuredClone(demoGame);
    game.player.name = request.session.user.name;
    game.player.avatar = request.session.user.avatar || game.player.avatar;
    const rewards = await rewardService.getPlayerRewards(request.session.user.id);
    Object.assign(game.player, rewards);
    let activities;
    let activeGoal = null;
    if (request.session.user.role === 'player') {
      const [playerActivities, progress, goals] = await Promise.all([
        activityService.listPlayerActivities(request.session.user.id, request.session.user.familyId),
        progressService.getPlayerProgress(request.session.user.id, request.session.user.familyId),
        weeklyGoalService.listGoals(request.session.user)
      ]);
      activities = playerActivities;
      activeGoal = goals.find((goal) => goal.status === 'active') || goals.find((goal) => goal.status === 'completed') || null;
      game.streak = {
        count: progress.stats.currentStreak,
        label: progress.stats.currentStreak === 1 ? 'día' : 'días',
        best: progress.stats.bestStreak
      };
    } else {
      ({ activities } = await activityService.listManagedActivities(request.session.user.familyId));
    }
    const flash = request.session.flash;
    delete request.session.flash;
    return response.render('pages/dashboard', {
      pageTitle: 'Mi aventura', activePage: 'home', game, activities,
      canManageMissions: request.session.user.role === 'admin_player', activeGoal, flash
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
    pageTitle: 'Elige tu avatar',
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
      pageTitle: 'Mis recompensas', activePage: 'rewards', rewards, transactions
    });
  } catch (error) { return next(error); }
}

async function showProgress(request, response, next) {
  try {
    if (request.session.user.role === 'admin_player') {
      const players = await progressService.getFamilyProgress(request.session.user.familyId);
      return response.render('pages/family-progress', {
        pageTitle: 'Progreso familiar', activePage: 'progress', players
      });
    }
    const progress = await progressService.getPlayerProgress(
      request.session.user.id, request.session.user.familyId
    );
    return response.render('pages/progress', {
      pageTitle: 'Mi progreso', activePage: 'progress', progress
    });
  } catch (error) { return next(error); }
}

module.exports = {
  showDashboard,
  showAvatars,
  showRewards,
  showProgress
};
