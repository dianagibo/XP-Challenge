const demoGame = require('../data/demo-game');

function showDashboard(request, response) {
  if (request.session.user.role === 'validator') {
    return response.render('pages/validator-home', {
      pageTitle: 'Validation center',
      activePage: 'home'
    });
  }
  const game = structuredClone(demoGame);
  game.player.name = request.session.user.name;
  game.player.avatar = request.session.user.avatar || game.player.avatar;
  return response.render('pages/dashboard', {
    pageTitle: 'My adventure',
    activePage: 'home',
    game
  });
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
