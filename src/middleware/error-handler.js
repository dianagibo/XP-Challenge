function notFound(request, response) {
  response.status(404).render('pages/not-found', { pageTitle: 'Page not found' });
}

function errorHandler(error, request, response, next) {
  console.error(error);
  if (response.headersSent) return next(error);
  if (error.status === 404) {
    return response.status(404).render('pages/not-found', { pageTitle: 'Mission not found' });
  }
  return response.status(500).render('pages/error', { pageTitle: 'Something went wrong' });
}

module.exports = { notFound, errorHandler };
