const express = require('express');
const homeController = require('../controllers/home.controller');
const { requireAuthentication } = require('../middleware/authentication');
const { allowRoles } = require('../middleware/authorization');

const router = express.Router();

router.get('/', requireAuthentication, homeController.showDashboard);
router.get('/avatars', requireAuthentication, allowRoles('admin_player', 'player', 'player_validator'), homeController.showAvatars);
router.get('/rewards', requireAuthentication, allowRoles('admin_player', 'player', 'player_validator'), homeController.showRewards);
router.get('/progress', requireAuthentication, allowRoles('admin_player', 'player', 'player_validator'), homeController.showProgress);

module.exports = router;
