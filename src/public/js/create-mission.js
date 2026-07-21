document.querySelectorAll('input[name="difficulty"]').forEach((input) => {
  input.addEventListener('change', () => {
    const reward = window.missionRewards[input.value];
    document.querySelector('#xpReward').value = reward.xp;
    document.querySelector('#coinReward').value = reward.coins;
  });
});
