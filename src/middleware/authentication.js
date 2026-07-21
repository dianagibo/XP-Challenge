function requireAuthentication(request, response, next) {
  if (!request.session.user) {
    request.session.returnTo = request.originalUrl;
    return response.redirect('/auth/login');
  }
  return next();
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
