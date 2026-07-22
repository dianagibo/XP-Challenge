const express = require('express');
const controller = require('./reward.controller');
const { requireAuthentication } = require('../../middleware/authentication');
const { allowRoles, requirePermission } = require('../../middleware/authorization');

const router = express.Router();
router.use(requireAuthentication);
router.get('/', allowRoles('admin_player', 'player', 'player_validator'), controller.showCatalog);
router.post('/', requirePermission('manageRewards'), controller.createReward);
router.post('/:id/toggle', requirePermission('manageRewards'), controller.toggleReward);
router.post('/:id/redeem', allowRoles('admin_player', 'player', 'player_validator'), controller.redeemReward);
router.post('/redemptions/:id/deliver', requirePermission('manageRewards'), controller.deliverRedemption);

module.exports = router;
