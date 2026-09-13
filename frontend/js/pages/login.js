    import api, { apiErrorMessage } from '/js/api.js';
    import { getUser } from '/js/auth.js';
    import { showToast } from '/js/toast.js';

    const existing = getUser();
    if (existing) {
      window.location.href = !existing.email_verified
        ? '/verify-email.html'
        : ['host', 'business_host'].includes(existing.role)
        ? '/host.html'
        : existing.role === 'admin' ? '/admin.html' : '/search.html';
    }

    const form = document.getElementById('login-form');
    const submitBtn = document.getElementById('login-submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';

      try {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));

        if (!res.data.user.email_verified) {
          window.location.href = '/verify-email.html';
        } else if (['host', 'business_host'].includes(res.data.user.role)) {
          window.location.href = '/host.html';
        } else if (res.data.user.role === 'admin') {
          window.location.href = '/admin.html';
        } else {
          window.location.href = '/search.html';
        }
      } catch (err) {
        showToast(apiErrorMessage(err, 'Login failed. Please check your credentials.'), 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
      }

    });
