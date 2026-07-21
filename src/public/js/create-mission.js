document.querySelectorAll('input[name="difficulty"]').forEach((input) => {
  input.addEventListener('change', () => {
    const reward = window.missionRewards[input.value];
    document.querySelector('#xpReward').value = reward.xp;
    document.querySelector('#coinReward').value = reward.coins;
  });
});

const frequency = document.querySelector('#missionFrequency');
const weekdayField = document.querySelector('#weekdayField');
const recurringFields = document.querySelectorAll('.recurring-only');
function updateRecurrenceFields() {
  if (!frequency) return;
  weekdayField.hidden = frequency.value !== 'weekly';
  recurringFields.forEach((field) => { field.hidden = frequency.value === 'once'; });
}
frequency?.addEventListener('change', updateRecurrenceFields);
updateRecurrenceFields();
