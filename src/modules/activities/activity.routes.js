const express = require('express');
const controller = require('./activity.controller');
const { requireAuthentication } = require('../../middleware/authentication');
const { allowRoles } = require('../../middleware/authorization');

const router = express.Router();
router.use(requireAuthentication, allowRoles('admin_player'));
router.get('/create', controller.showCreate);
router.post('/', controller.create);
router.get('/manage', controller.showManage);

module.exports = router;
