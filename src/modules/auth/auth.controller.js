const authService = require('./auth.service');

const SAFE_RETURN_PATHS = new Set(['/', '/avatars', '/rewards', '/progress']);
const SAFE_RETURN_PREFIXES = [
  '/missions/',
  '/reward-catalog',
  '/weekly-goals',
  '/account/',
  '/notifications',
  '/bonuses',
  '/weekly-report',
  '/family-users'
];

function safeReturnTo(value) {
  if (typeof value !== 'string') return '/';
  try {
    const url = new URL(value, 'http://localhost');
    if (url.origin !== 'http://localhost') return '/';
    const isApplicationPage = SAFE_RETURN_PATHS.has(url.pathname)
      || SAFE_RETURN_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix));
    return isApplicationPage ? `${url.pathname}${url.search}` : '/';
  } catch {
    return '/';
  }
}

function showLogin(request, response) {
  response.render('pages/login', { pageTitle: 'Iniciar sesión', error: null, username: '' });
}

async function login(request, response, next) {
  try {
    const { username, password } = request.body;
    if (!username || !password) {
      return response.status(400).render('pages/login', {
        pageTitle: 'Iniciar sesión', error: 'Escribe tu usuario y contraseña.', username: username || ''
      });
    }

    const authenticatedUser = await authService.authenticate(username, password);
    if (!authenticatedUser) {
      return response.status(401).render('pages/login', {
        pageTitle: 'Iniciar sesión', error: 'El usuario o la contraseña son incorrectos.', username
      });
    }

    const destination = safeReturnTo(request.session.returnTo);
    delete request.session.returnTo;
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

module.exports = { showLogin, login, logout, safeReturnTo };
