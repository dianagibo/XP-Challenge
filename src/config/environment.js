require('dotenv').config({ quiet: true });

const required = ['MONGODB_URI', 'SESSION_SECRET'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI,
  sessionSecret: process.env.SESSION_SECRET,
  isProduction: process.env.NODE_ENV === 'production'
};
