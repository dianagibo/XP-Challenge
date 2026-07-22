const service = require('./notification.service');

async function showNotifications(request, response, next) {
  try {
    const notifications = await service.listForUser(request.session.user);
    return response.render('pages/notifications', {
      pageTitle: 'Notificaciones', activePage: 'notifications', notifications
    });
  } catch (error) { return next(error); }
}

async function markRead(request, response, next) {
  try {
    const notification = await service.markRead(request.params.id, request.session.user);
    return response.redirect(safeInternalUrl(notification.url));
  } catch (error) { return next(error); }
}

async function markAllRead(request, response, next) {
  try {
    await service.markAllRead(request.session.user);
    return response.redirect('/notifications');
  } catch (error) { return next(error); }
}

function safeInternalUrl(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/notifications';
}

module.exports = { showNotifications, markRead, markAllRead };
