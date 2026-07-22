const express = require('express');
const controller = require('./weekly-report.controller');
const { requireAuthentication } = require('../../middleware/authentication');
const { requirePermission } = require('../../middleware/authorization');

const router = express.Router();
router.use(requireAuthentication, requirePermission('viewFamilyReport'));
router.get('/', controller.show);

module.exports = router;
