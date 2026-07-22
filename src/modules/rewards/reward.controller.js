const rewardService = require('./reward.service');

async function showCatalog(request, response, next) {
  try {
    const isAdmin = request.session.user.role === 'admin_player';
    const [rewards, catalog, redemptions] = await Promise.all([
      rewardService.getPlayerRewards(request.session.user.id),
      rewardService.listCatalog(request.session.user.familyId, isAdmin),
      isAdmin
        ? rewardService.listFamilyRedemptions(request.session.user.familyId)
        : rewardService.listPlayerRedemptions(request.session.user.id, request.session.user.familyId)
    ]);
    const flash = request.session.flash;
    delete request.session.flash;
    return response.render('pages/reward-catalog', {
      pageTitle: isAdmin ? 'Catálogo de recompensas' : 'Elige una recompensa', activePage: 'catalog',
      rewards, catalog, redemptions, isAdmin, flash
    });
  } catch (error) { return next(error); }
}

async function createReward(request, response, next) {
  try {
    await rewardService.createReward(request.body, request.session.user);
    request.session.flash = { type: 'success', message: 'Recompensa agregada al catálogo.' };
    return response.redirect('/reward-catalog');
  } catch (error) {
    if (error.status === 400) {
      request.session.flash = { type: 'error', message: error.message };
      return response.redirect('/reward-catalog');
    }
    return next(error);
  }
}

async function toggleReward(request, response, next) {
  try {
    const reward = await rewardService.toggleReward(request.params.id, request.session.user);
    request.session.flash = { type: 'success', message: `Recompensa ${reward.isActive ? 'activada' : 'desactivada'}.` };
    return response.redirect('/reward-catalog');
  } catch (error) { return next(error); }
}

async function redeemReward(request, response, next) {
  try {
    await rewardService.redeemReward(request.params.id, request.session.user);
    request.session.flash = { type: 'success', message: '¡Recompensa canjeada! Diana coordinará la entrega.' };
    return response.redirect('/reward-catalog');
  } catch (error) {
    if ([400, 409].includes(error.status)) {
      request.session.flash = { type: 'error', message: error.message };
      return response.redirect('/reward-catalog');
    }
    return next(error);
  }
}

async function deliverRedemption(request, response, next) {
  try {
    await rewardService.deliverRedemption(request.params.id, request.session.user);
    request.session.flash = { type: 'success', message: 'Recompensa marcada como entregada.' };
    return response.redirect('/reward-catalog');
  } catch (error) { return next(error); }
}

module.exports = { showCatalog, createReward, toggleReward, redeemReward, deliverRedemption };
