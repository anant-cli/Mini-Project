    import api, { apiErrorMessage } from '/js/api.js';
    import { showToast } from '/js/toast.js';

    const rememberedEmail = sessionStorage.getItem('reset_email');
    if (rememberedEmail) document.getElementById('email').value = rememberedEmail;

    const otpInput = document.getElementById('otp');
    otpInput.addEventListener('input', () => {
      otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
    });

    const form = document.getElementById('reset-form');
    const errorEl = document.getElementById('reset-error');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';
      const submitBtn = document.getElementById('reset-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Resetting...';

      try {
        await api.post('/auth/reset-password', {
          email: document.getElementById('email').value.trim(),
          otp: otpInput.value,
          new_password: document.getElementById('new-password').value,
        });
        sessionStorage.removeItem('reset_email');
        showToast('Password reset. Please log in.', 'success');
        window.location.href = '/login.html';
      } catch (err) {
        errorEl.textContent = apiErrorMessage(err, 'Could not reset your password.');
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';
      }
    });
