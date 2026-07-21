const mongoose = require('mongoose');
const environment = require('./environment');

async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(environment.mongoUri);
  console.log('MongoDB connection established');
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
