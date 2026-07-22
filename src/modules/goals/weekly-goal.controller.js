const service = require('./weekly-goal.service');

async function showGoals(request, response, next) {
  try {
    const [goals, players] = await Promise.all([service.listGoals(request.session.user), request.session.user.role === 'admin_player' ? service.getPlayers(request.session.user.familyId) : []]);
    const flash = request.session.flash; delete request.session.flash;
    return response.render('pages/weekly-goals', { pageTitle: 'Metas semanales', activePage: 'goals', goals, players, flash, error: null, values: {}, categories: service.CATEGORIES, today: service.localDateString(new Date()) });
  } catch (error) { return next(error); }
}

async function createGoal(request, response, next) {
  try {
    await service.createGoal(request.body, request.session.user);
    request.session.flash = { type: 'success', message: '¡Meta semanal creada!' };
    return response.redirect('/weekly-goals');
  } catch (error) {
    if (error.status === 400) {
      try {
        const [goals, players] = await Promise.all([service.listGoals(request.session.user), service.getPlayers(request.session.user.familyId)]);
        return response.status(400).render('pages/weekly-goals', { pageTitle: 'Metas semanales', activePage: 'goals', goals, players, flash: null, error: error.message, values: request.body, categories: service.CATEGORIES, today: service.localDateString(new Date()) });
      } catch (lookupError) { return next(lookupError); }
    }
    return next(error);
  }
}

module.exports = { showGoals, createGoal };
