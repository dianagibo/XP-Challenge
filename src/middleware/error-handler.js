function notFound(request, response) {
  response.status(404).render('pages/not-found', { pageTitle: 'Página no encontrada' });
}

function errorHandler(error, request, response, next) {
  console.error(error);
  if (response.headersSent) return next(error);
  if (error.status === 404) {
    return response.status(404).render('pages/not-found', { pageTitle: 'Misión no encontrada' });
  }
  return response.status(500).render('pages/error', { pageTitle: 'Algo salió mal' });
}

module.exports = { notFound, errorHandler };
