const DEFAULTS = Object.freeze({
  admin_player: { participate: true, createMissions: true, reviewOwnMissions: true, validateResponsibilities: true, viewFamilyReport: true, createBonuses: true, manageRewards: true, manageUsers: true },
  player: { participate: true, createMissions: true, reviewOwnMissions: true, validateResponsibilities: false, viewFamilyReport: true, createBonuses: false, manageRewards: false, manageUsers: false },
  validator: { participate: false, createMissions: true, reviewOwnMissions: true, validateResponsibilities: true, viewFamilyReport: true, createBonuses: false, manageRewards: false, manageUsers: false },
  player_validator: { participate: true, createMissions: true, reviewOwnMissions: true, validateResponsibilities: true, viewFamilyReport: true, createBonuses: false, manageRewards: false, manageUsers: false }
});

const KEYS = Object.keys(DEFAULTS.admin_player);
function effectivePermissions(role, stored = {}) {
  const defaults = DEFAULTS[role] || {};
  return Object.fromEntries(KEYS.map((key) => [key, typeof stored?.[key] === 'boolean' ? stored[key] : Boolean(defaults[key])]));
}
function hasPermission(user, permission) {
  return Boolean(user?.permissions?.[permission] ?? DEFAULTS[user?.role]?.[permission]);
}
module.exports = { DEFAULTS, KEYS, effectivePermissions, hasPermission };
