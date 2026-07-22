const express = require('express');
const homeController = require('../controllers/home.controller');
const { requireAuthentication } = require('../middleware/authentication');
const { allowRoles } = require('../middleware/authorization');

const router = express.Router();

router.use(requireAuthentication);
router.get('/', homeController.showDashboard);
router.get('/avatars', allowRoles('admin_player', 'player', 'player_validator'), homeController.showAvatars);
router.get('/rewards', allowRoles('admin_player', 'player', 'player_validator'), homeController.showRewards);
router.get('/progress', allowRoles('admin_player', 'player', 'player_validator'), homeController.showProgress);

module.exports = router;
