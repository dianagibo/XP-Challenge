function allowRoles(...roles) {
  return (request, response, next) => {
    if (!request.session.user || !roles.includes(request.session.user.role)) {
      return response.status(403).render('pages/forbidden', { pageTitle: 'Access denied' });
    }
    return next();
  };
}

module.exports = { allowRoles };
