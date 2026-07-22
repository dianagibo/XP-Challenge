const path = require('node:path');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const helmet = require('helmet');
const homeRoutes = require('./routes/home.routes');
const authRoutes = require('./modules/auth/auth.routes');
const activityRoutes = require('./modules/activities/activity.routes');
const rewardRoutes = require('./modules/rewards/reward.routes');
const weeklyGoalRoutes = require('./modules/goals/weekly-goal.routes');
const accountRoutes = require('./modules/accounts/account.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const bonusRoutes = require('./modules/bonuses/bonus.routes');
const notificationService = require('./modules/notifications/notification.service');
const { exposeCurrentUser } = require('./middleware/authentication');
const { notFound, errorHandler } = require('./middleware/error-handler');
const csrfProtection = require('./middleware/csrf');
const environment = require('./config/environment');

const app = express();

if (environment.isProduction) app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet({ contentSecurityPolicy: false }));
app.get('/health', (request, response) => {
  const databaseReady = mongoose.connection.readyState === 1;
  response.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? 'ok' : 'unavailable',
    database: databaseReady ? 'connected' : 'disconnected'
  });
});
app.use(session({
  name: 'xp.sid',
  secret: environment.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: environment.mongoUri }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: environment.isProduction,
    maxAge: 1000 * 60 * 60 * 8
  }
}));
app.use(exposeCurrentUser);
app.use(notificationService.exposeUnreadCount);
app.use((request, response, next) => {
  const labels = {
    category: { all: 'Todas las misiones', home: 'Hogar', school: 'Colegio', wellbeing: 'Bienestar', personal_growth: 'Crecimiento personal', family: 'Familia' },
    difficulty: { easy: 'Fácil', medium: 'Media', hard: 'Difícil', epic: 'Épica' },
    status: { assigned: 'Asignada', pending_validation: 'Esperando aprobación', changes_requested: 'Necesita ajustes', approved: 'Aprobada', canceled: 'Cancelada', active: 'Activa', paused: 'Pausada', completed: 'Cumplida', expired: 'Finalizada', pending_delivery: 'Pendiente de entrega', delivered: 'Entregada' },
    frequency: { once: 'Una vez', daily: 'Todos los días', weekly: 'Días seleccionados' }
  };
  response.locals.labelFor = (group, value) => labels[group]?.[value] || String(value || '').replaceAll('_', ' ');
  response.locals.formatDate = (value, includeTime = false) => new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', ...(includeTime ? { timeStyle: 'short' } : {}), timeZone: 'America/Bogota'
  }).format(new Date(value));
  next();
});
app.use(csrfProtection);

app.use('/auth', authRoutes);
app.use('/missions', activityRoutes);
app.use('/reward-catalog', rewardRoutes);
app.use('/weekly-goals', weeklyGoalRoutes);
app.use('/account', accountRoutes);
app.use('/notifications', notificationRoutes);
app.use('/bonuses', bonusRoutes);
app.use('/', homeRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
