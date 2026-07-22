function allowRoles(...roles) {
  return (request, response, next) => {
    if (!request.session.user || !roles.includes(request.session.user.role)) {
      return response.status(403).render('pages/forbidden', { pageTitle: 'Acceso denegado' });
    }
    return next();
  };
}

function requirePermission(permission) {
  return (request, response, next) => {
    if (!request.session.user?.permissions?.[permission]) {
      return response.status(403).render('pages/forbidden', { pageTitle: 'Acceso denegado' });
    }
    return next();
  };
}

module.exports = { allowRoles, requirePermission };
