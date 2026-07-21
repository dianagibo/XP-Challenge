const path = require('node:path');
const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const helmet = require('helmet');
const homeRoutes = require('./routes/home.routes');
const authRoutes = require('./modules/auth/auth.routes');
const activityRoutes = require('./modules/activities/activity.routes');
const rewardRoutes = require('./modules/rewards/reward.routes');
const weeklyGoalRoutes = require('./modules/goals/weekly-goal.routes');
const { exposeCurrentUser } = require('./middleware/authentication');
const { notFound, errorHandler } = require('./middleware/error-handler');
const csrfProtection = require('./middleware/csrf');
const environment = require('./config/environment');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet({ contentSecurityPolicy: false }));
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
app.use(csrfProtection);

app.use('/auth', authRoutes);
app.use('/missions', activityRoutes);
app.use('/reward-catalog', rewardRoutes);
app.use('/weekly-goals', weeklyGoalRoutes);
app.use('/', homeRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
