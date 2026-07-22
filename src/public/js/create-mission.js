document.querySelectorAll('input[name="difficulty"]').forEach((input) => {
  input.addEventListener('change', () => {
    const reward = window.missionRewards[input.value];
    const xpReward = document.querySelector('#xpReward');
    const coinReward = document.querySelector('#coinReward');
    if (xpReward) xpReward.value = reward.xp;
    if (coinReward) coinReward.value = reward.coins;
  });
});

const frequency = document.querySelector('#missionFrequency');
const weekdayField = document.querySelector('#weekdayField');
const recurringFields = document.querySelectorAll('.recurring-only');
function updateRecurrenceFields() {
  if (!frequency) return;
  if (weekdayField) weekdayField.hidden = frequency.value !== 'weekly';
  recurringFields.forEach((field) => { field.hidden = frequency.value === 'once'; });
}
frequency?.addEventListener('change', updateRecurrenceFields);
updateRecurrenceFields();
