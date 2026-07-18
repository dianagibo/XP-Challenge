document.querySelectorAll('.demo-action').forEach((button) => {
  button.addEventListener('click', () => {
    button.classList.add('completed-animation');
    const label = button.querySelector('span');
    if (label) label.textContent = 'Sent to validation';

    const toastElement = document.getElementById('demoToast');
    if (toastElement) bootstrap.Toast.getOrCreateInstance(toastElement).show();
  });
});

document.querySelectorAll('.avatar-option:not(.locked)').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.avatar-option').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    document.querySelectorAll('.avatar-option small').forEach((item) => {
      if (!item.closest('.locked')) item.textContent = 'Tap to choose';
    });
    button.querySelector('small').textContent = 'Selected';
  });
});

