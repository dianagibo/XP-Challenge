const express = require('express');
const controller = require('./activity.controller');
const { requireAuthentication } = require('../../middleware/authentication');
const { allowRoles, requirePermission } = require('../../middleware/authorization');

const router = express.Router();
router.use(requireAuthentication);
router.get('/create', requirePermission('createMissions'), controller.showCreate);
router.post('/', requirePermission('createMissions'), controller.create);
router.get('/manage', requirePermission('createMissions'), controller.showManage);
router.get('/archive', allowRoles('admin_player'), controller.showArchive);
router.get('/:activityId/edit', allowRoles('admin_player'), controller.showEdit);
router.post('/:activityId/edit', allowRoles('admin_player'), controller.update);
router.post('/:activityId/cancel', allowRoles('admin_player'), controller.cancel);
router.post('/:activityId/archive', allowRoles('admin_player'), controller.archive);
router.post('/recurring/:seriesId/status', allowRoles('admin_player'), controller.setRecurringActive);
router.get('/recurring/:seriesId/edit', allowRoles('admin_player'), controller.showEditRecurring);
router.post('/recurring/:seriesId/edit', allowRoles('admin_player'), controller.updateRecurring);
router.post('/recurring/:seriesId/end', allowRoles('admin_player'), controller.endRecurring);
router.get('/review', controller.showReviewQueue);
router.get('/review/:activityId', controller.showReviewDetails);
router.post('/review/:activityId', controller.review);
router.get('/:activityId', requirePermission('participate'), controller.showDetails);
router.post('/:activityId/accept', requirePermission('participate'), controller.acceptSharedMission);
router.post('/:activityId/return', requirePermission('participate'), controller.returnSharedMission);
router.post('/:activityId/submit', requirePermission('participate'), controller.submitForApproval);

module.exports = router;
