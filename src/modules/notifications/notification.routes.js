const express = require('express');
const controller = require('./notification.controller');
const { requireAuthentication } = require('../../middleware/authentication');

const router = express.Router();
router.use(requireAuthentication);
router.get('/', controller.showNotifications);
router.post('/read-all', controller.markAllRead);
router.post('/:id/read', controller.markRead);
module.exports = router;
