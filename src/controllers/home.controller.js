const demoGame = require('../data/demo-game');

function showDashboard(request, response) {
  response.render('pages/dashboard', {
    pageTitle: 'My adventure',
    activePage: 'home',
    game: demoGame
  });
}

function showAvatars(request, response) {
  response.render('pages/avatars', {
    pageTitle: 'Choose your avatar',
    activePage: 'profile',
    game: demoGame
  });
}

module.exports = {
  showDashboard,
  showAvatars
};

