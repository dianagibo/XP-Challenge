require('dotenv').config({ quiet: true });
const { connectDatabase, disconnectDatabase } = require('../config/database');
const User = require('../modules/users/user.model');
const Family = require('../modules/families/family.model');

async function migrateSpanish() {
  await connectDatabase();

  const [mom, family] = await Promise.all([
    User.updateMany({ name: 'Mom' }, { $set: { name: 'Mamá' } }),
    Family.updateMany({ name: 'XP Challenge Family' }, { $set: { name: 'Familia XP Challenge' } })
  ]);

  console.log(`Usuarios actualizados: ${mom.modifiedCount}`);
  console.log(`Familias actualizadas: ${family.modifiedCount}`);
  console.log('Migración al español finalizada. No se modificó el progreso.');
}

migrateSpanish()
  .then(() => disconnectDatabase())
  .catch(async (error) => {
    console.error('Error en la migración:', error.message);
    await disconnectDatabase();
    process.exit(1);
  });
