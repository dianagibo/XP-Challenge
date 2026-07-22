const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('./auth.controller');
const { redirectIfAuthenticated, requireAuthentication } = require('../../middleware/authentication');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en 15 minutos.'
});

router.get('/login', redirectIfAuthenticated, authController.showLogin);
router.post('/login', redirectIfAuthenticated, loginLimiter, authController.login);
router.post('/logout', requireAuthentication, authController.logout);

module.exports = router;
