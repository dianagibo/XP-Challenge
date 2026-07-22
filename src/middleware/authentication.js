const User = require('../modules/users/user.model');

async function requireAuthentication(request, response, next) {
  if (!request.session.user) {
    request.session.returnTo = request.originalUrl;
    return response.redirect('/auth/login');
  }
  try {
    const user = await User.findById(request.session.user.id).select('isActive sessionVersion');
    if (!user?.isActive || (user.sessionVersion || 0) !== (request.session.user.sessionVersion || 0)) {
      return request.session.destroy(() => response.redirect('/auth/login?session=expired'));
    }
    return next();
  } catch (error) { return next(error); }
}

function exposeCurrentUser(request, response, next) {
  response.locals.currentUser = request.session?.user || null;
  next();
}

function redirectIfAuthenticated(request, response, next) {
  if (request.session.user) return response.redirect('/');
  return next();
}

module.exports = { requireAuthentication, exposeCurrentUser, redirectIfAuthenticated };
