const Notification = require('./notification.model');
const Membership = require('../families/membership.model');

async function createForRecipients({ family, recipients, type, title, message, url, eventKey }, session = null) {
  const uniqueRecipients = [...new Set(recipients.filter(Boolean).map(String))];
  if (!uniqueRecipients.length) return;
  const operations = uniqueRecipients.map((recipient) => ({
    updateOne: {
      filter: { recipient, eventKey },
      update: { $setOnInsert: { family, recipient, type, title, message, url, eventKey } },
      upsert: true
    }
  }));
  await Notification.bulkWrite(operations, { ordered: false, ...(session ? { session } : {}) });
}

async function findRecipientsByRoles(family, roles) {
  const memberships = await Membership.find({ family, role: { $in: roles }, isActive: true })
    .populate({ path: 'user', match: { isActive: true }, select: '_id' }).lean();
  return memberships.filter((item) => item.user).map((item) => item.user._id);
}

async function listForUser(currentUser) {
  return Notification.find({ family: currentUser.familyId, recipient: currentUser.id })
    .sort({ createdAt: -1 }).limit(100).lean();
}

async function unreadCount(currentUser) {
  return Notification.countDocuments({ family: currentUser.familyId, recipient: currentUser.id, readAt: null });
}

async function markRead(notificationId, currentUser) {
  if (!Notification.db.base.isValidObjectId(notificationId)) throw notFoundError();
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, family: currentUser.familyId, recipient: currentUser.id },
    { $set: { readAt: new Date() } }, { new: true }
  );
  if (!notification) throw notFoundError();
  return notification;
}

async function markAllRead(currentUser) {
  return Notification.updateMany(
    { family: currentUser.familyId, recipient: currentUser.id, readAt: null },
    { $set: { readAt: new Date() } }
  );
}

async function exposeUnreadCount(request, response, next) {
  response.locals.unreadNotificationCount = 0;
  if (!request.session?.user) return next();
  try {
    response.locals.unreadNotificationCount = await unreadCount(request.session.user);
    return next();
  } catch (error) { return next(error); }
}

function notFoundError() { const error = new Error('No encontramos la notificación.'); error.status = 404; return error; }

module.exports = { createForRecipients, findRecipientsByRoles, listForUser, unreadCount, markRead, markAllRead, exposeUnreadCount };
