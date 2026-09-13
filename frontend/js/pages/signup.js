    import api, { apiErrorMessage } from '/js/api.js';

    const form = document.getElementById('signup-form');
    const submitBtn = document.getElementById('signup-submit');
    const errorEl = document.getElementById('signup-error');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const password = document.getElementById('password').value;
      const role = document.getElementById('role').value;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      try {
        const res = await api.post('/auth/signup', {
          name, email, password, role,
          ...(phone ? { phone } : {}),
        });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        window.location.href = '/verify-email.html';
      } catch (err) {
        errorEl.textContent = apiErrorMessage(err, 'Signup failed. Please try again.');
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue';
      }
    });
