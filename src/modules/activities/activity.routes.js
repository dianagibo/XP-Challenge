const express = require('express');
const controller = require('./activity.controller');
const { requireAuthentication } = require('../../middleware/authentication');
const { allowRoles } = require('../../middleware/authorization');

const router = express.Router();
router.use(requireAuthentication);
router.get('/create', allowRoles('admin_player'), controller.showCreate);
router.post('/', allowRoles('admin_player'), controller.create);
router.get('/manage', allowRoles('admin_player'), controller.showManage);
router.get('/:activityId', allowRoles('player'), controller.showDetails);
router.post('/:activityId/submit', allowRoles('player'), controller.submitForApproval);

module.exports = router;
