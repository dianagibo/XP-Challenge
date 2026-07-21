const environment = require('./config/environment');
const connectDatabase = require('./config/database');
const app = require('./app');

async function startServer() {
  await connectDatabase();
  app.listen(environment.port, () => {
    console.log(`XP Challenge is running at http://localhost:${environment.port}`);
  });
}

startServer().catch((error) => {
  console.error('XP Challenge could not start:', error.message);
  process.exit(1);
});
