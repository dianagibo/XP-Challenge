require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const User = require('../modules/users/user.model');
const Family = require('../modules/families/family.model');
const Membership = require('../modules/families/membership.model');

const accounts = [
  { key: 'DIANA', name: 'Diana', username: process.env.SEED_DIANA_USERNAME || 'diana', role: 'admin_player', avatar: 'lumi' },
  { key: 'SOFI', name: 'Sofi', username: process.env.SEED_SOFI_USERNAME || 'sofi', role: 'player', avatar: 'nova' },
  { key: 'MOM', name: 'Mom', username: process.env.SEED_MOM_USERNAME || 'mom', role: 'validator', avatar: 'aria' }
];

async function seed() {
  const missingPasswords = accounts.filter((account) => !process.env[`SEED_${account.key}_PASSWORD`]);
  if (missingPasswords.length) {
    throw new Error(`Missing seed passwords for: ${missingPasswords.map((account) => account.key).join(', ')}`);
  }

  await connectDatabase();
  const family = await Family.findOneAndUpdate(
    { name: process.env.SEED_FAMILY_NAME || 'XP Challenge Family' },
    { timezone: 'America/Bogota', currency: 'COP', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(process.env[`SEED_${account.key}_PASSWORD`], 12);
    const user = await User.findOneAndUpdate(
      { username: account.username.toLowerCase() },
      { name: account.name, passwordHash, isActive: true, selectedAvatar: account.avatar },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await Membership.findOneAndUpdate(
      { user: user._id, family: family._id },
      { role: account.role, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Seeded ${account.name} (${account.role})`);
  }
}

seed()
  .then(() => disconnectDatabase())
  .catch(async (error) => {
    console.error('Seed failed:', error.message);
    await disconnectDatabase();
    process.exit(1);
  });
