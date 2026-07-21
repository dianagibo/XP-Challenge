const express = require('express');
const controller = require('./weekly-goal.controller');
const { requireAuthentication } = require('../../middleware/authentication');
const { allowRoles } = require('../../middleware/authorization');

const router = express.Router();
router.use(requireAuthentication);
router.get('/', allowRoles('admin_player', 'player'), controller.showGoals);
router.post('/', allowRoles('admin_player'), controller.createGoal);
module.exports = router;
