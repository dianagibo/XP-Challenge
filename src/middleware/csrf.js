const crypto = require('node:crypto');

function csrfProtection(request, response, next) {
  if (!request.session.csrfToken) request.session.csrfToken = crypto.randomBytes(32).toString('hex');
  response.locals.csrfToken = request.session.csrfToken;

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const submittedToken = request.body?._csrf;
    const expected = Buffer.from(request.session.csrfToken);
    const submitted = Buffer.from(String(submittedToken || ''));
    if (expected.length !== submitted.length || !crypto.timingSafeEqual(expected, submitted)) {
      return response.status(403).render('pages/forbidden', { pageTitle: 'Solicitud vencida' });
    }
  }
  return next();
}

module.exports = csrfProtection;
