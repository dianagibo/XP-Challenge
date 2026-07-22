const express = require('express');
const controller = require('./activity.controller');
const { requireAuthentication } = require('../../middleware/authentication');
const { allowRoles } = require('../../middleware/authorization');

const router = express.Router();
router.use(requireAuthentication);
router.get('/create', allowRoles('admin_player', 'player'), controller.showCreate);
router.post('/', allowRoles('admin_player', 'player'), controller.create);
router.get('/manage', allowRoles('admin_player', 'player'), controller.showManage);
router.get('/archive', allowRoles('admin_player'), controller.showArchive);
router.get('/:activityId/edit', allowRoles('admin_player'), controller.showEdit);
router.post('/:activityId/edit', allowRoles('admin_player'), controller.update);
router.post('/:activityId/cancel', allowRoles('admin_player'), controller.cancel);
router.post('/:activityId/archive', allowRoles('admin_player'), controller.archive);
router.post('/recurring/:seriesId/status', allowRoles('admin_player'), controller.setRecurringActive);
router.get('/recurring/:seriesId/edit', allowRoles('admin_player'), controller.showEditRecurring);
router.post('/recurring/:seriesId/edit', allowRoles('admin_player'), controller.updateRecurring);
router.post('/recurring/:seriesId/end', allowRoles('admin_player'), controller.endRecurring);
router.get('/review', allowRoles('admin_player', 'player', 'validator'), controller.showReviewQueue);
router.get('/review/:activityId', allowRoles('admin_player', 'player', 'validator'), controller.showReviewDetails);
router.post('/review/:activityId', allowRoles('admin_player', 'player', 'validator'), controller.review);
router.get('/:activityId', allowRoles('admin_player', 'player'), controller.showDetails);
router.post('/:activityId/accept', allowRoles('admin_player'), controller.acceptSharedMission);
router.post('/:activityId/return', allowRoles('admin_player'), controller.returnSharedMission);
router.post('/:activityId/submit', allowRoles('admin_player', 'player'), controller.submitForApproval);

module.exports = router;
