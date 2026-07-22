const accountService = require('./account.service');

async function showSettings(request, response, next) {
  try {
    const accounts = request.session.user.role === 'admin_player' ? await accountService.listFamilyAccounts(request.session.user) : [];
    const flash = request.session.flash; delete request.session.flash;
    return response.render('pages/account-settings', { pageTitle: 'Configuración de cuenta', activePage: 'settings', accounts, flash, error: null });
  } catch (error) { return next(error); }
}
async function changePassword(request, response, next) {
  try {
    const version = await accountService.changeOwnPassword(request.session.user, request.body.currentPassword, request.body.newPassword, request.body.confirmPassword);
    request.session.user.sessionVersion = version;
    request.session.flash = { type: 'success', message: 'Contraseña actualizada. Las demás sesiones se cerraron.' };
    return response.redirect('/account/settings');
  } catch (error) { return handle(request, response, next, error); }
}
async function resetPassword(request, response, next) {
  try {
    await accountService.resetFamilyPassword(request.session.user, request.params.userId, request.body.newPassword, request.body.confirmPassword);
    request.session.flash = { type: 'success', message: 'Contraseña restablecida. La cuenta deberá iniciar sesión nuevamente.' };
    return response.redirect('/account/settings');
  } catch (error) { return handle(request, response, next, error); }
}
async function selectAvatar(request, response, next) {
  try {
    const avatar = await accountService.updateAvatar(request.session.user, request.body.avatar);
    request.session.user.avatar = avatar;
    request.session.flash = { type: 'success', message: '¡Tu avatar fue actualizado!' };
    return response.redirect('/avatars');
  } catch (error) { return next(error); }
}
async function handle(request, response, next, error) {
  if (error.status !== 400) return next(error);
  try {
    const accounts = request.session.user.role === 'admin_player' ? await accountService.listFamilyAccounts(request.session.user) : [];
    return response.status(400).render('pages/account-settings', { pageTitle: 'Configuración de cuenta', activePage: 'settings', accounts, flash: null, error: error.message });
  } catch (lookupError) { return next(lookupError); }
}
module.exports = { showSettings, changePassword, resetPassword, selectAvatar };
