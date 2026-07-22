const express = require('express');
const controller = require('./reward.controller');
const { requireAuthentication } = require('../../middleware/authentication');
const { allowRoles } = require('../../middleware/authorization');

const router = express.Router();
router.use(requireAuthentication);
router.get('/', allowRoles('admin_player', 'player'), controller.showCatalog);
router.post('/', allowRoles('admin_player'), controller.createReward);
router.post('/:id/toggle', allowRoles('admin_player'), controller.toggleReward);
router.post('/:id/redeem', allowRoles('admin_player', 'player'), controller.redeemReward);
router.post('/redemptions/:id/deliver', allowRoles('admin_player'), controller.deliverRedemption);

module.exports = router;
