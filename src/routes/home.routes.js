const express = require('express');
const homeController = require('../controllers/home.controller');

const router = express.Router();

router.get('/', homeController.showDashboard);
router.get('/avatars', homeController.showAvatars);

module.exports = router;

