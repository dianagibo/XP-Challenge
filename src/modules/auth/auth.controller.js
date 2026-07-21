const authService = require('./auth.service');

function showLogin(request, response) {
  response.render('pages/login', { pageTitle: 'Log in', error: null, username: '' });
}

async function login(request, response, next) {
  try {
    const { username, password } = request.body;
    if (!username || !password) {
      return response.status(400).render('pages/login', {
        pageTitle: 'Log in', error: 'Enter your username and password.', username: username || ''
      });
    }

    const authenticatedUser = await authService.authenticate(username, password);
    if (!authenticatedUser) {
      return response.status(401).render('pages/login', {
        pageTitle: 'Log in', error: 'The username or password is incorrect.', username
      });
    }

    const destination = request.session.returnTo || '/';
    return request.session.regenerate((error) => {
      if (error) return next(error);
      request.session.user = authenticatedUser;
      return request.session.save((saveError) => saveError ? next(saveError) : response.redirect(destination));
    });
  } catch (error) {
    return next(error);
  }
}

function logout(request, response, next) {
  request.session.destroy((error) => {
    if (error) return next(error);
    response.clearCookie('xp.sid');
    return response.redirect('/auth/login');
  });
}

module.exports = { showLogin, login, logout };
