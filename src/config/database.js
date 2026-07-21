const mongoose = require('mongoose');
const environment = require('./environment');

async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(environment.mongoUri);
  console.log('MongoDB connection established');
}

module.exports = connectDatabase;
