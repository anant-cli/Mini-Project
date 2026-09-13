    import api, { apiErrorMessage } from '/js/api.js';
    import { showToast } from '/js/toast.js';

    const form = document.getElementById('forgot-form');
    const submitBtn = document.getElementById('forgot-submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        await api.post('/auth/forgot-password', { email });
        showToast('If an account exists for that email, a reset code has been sent.', 'success');
        sessionStorage.setItem('reset_email', email);
        window.location.href = '/reset-password.html';
      } catch (err) {
        showToast(apiErrorMessage(err, 'Something went wrong. Please try again.'), 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Code';
      }
    });
