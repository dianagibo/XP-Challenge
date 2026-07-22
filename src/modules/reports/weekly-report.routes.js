const express = require('express');
const controller = require('./weekly-report.controller');
const { requireAuthentication } = require('../../middleware/authentication');
const { allowRoles } = require('../../middleware/authorization');

const router = express.Router();
router.use(requireAuthentication, allowRoles('admin_player', 'player', 'validator'));
router.get('/', controller.show);

module.exports = router;
