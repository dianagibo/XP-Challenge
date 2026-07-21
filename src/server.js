const environment = require('./config/environment');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const app = require('./app');

async function startServer() {
  await connectDatabase();
  const server = app.listen(environment.port, () => {
    console.log(`XP Challenge is running at http://localhost:${environment.port}`);
  });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received. Shutting down gracefully.`);
    server.close(async () => {
      try {
        await disconnectDatabase();
        process.exit(0);
      } catch (error) {
        console.error('Graceful shutdown failed:', error.message);
        process.exit(1);
      }
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('XP Challenge could not start:', error.message);
  process.exit(1);
});
