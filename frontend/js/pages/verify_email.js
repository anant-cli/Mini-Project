    import api, { apiErrorMessage } from '/js/api.js';
    import { getUser, getToken, logout } from '/js/auth.js';
    import { showToast } from '/js/toast.js';

    const user = getUser();
    if (!user || !getToken()) {
      window.location.href = '/login.html';
    } else {
      document.getElementById('user-email').textContent = user.email;
      if (user.email_verified) {
        goNext();
      }
    }

    function goNext() {
      if (user.kyc_status && user.kyc_status !== 'unsubmitted') {
        goToApp();
      } else {
        window.location.href = '/kyc-setup.html';
      }
    }

    function goToApp() {
      if (['host', 'business_host'].includes(user.role)) window.location.href = '/host.html';
      else if (user.role === 'admin') window.location.href = '/admin.html';
      else window.location.href = '/search.html';
    }

    const form = document.getElementById('verify-form');
    const errorEl = document.getElementById('verify-error');
    const otpInput = document.getElementById('otp');
    otpInput.addEventListener('input', () => {
      otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';
      const submitBtn = document.getElementById('verify-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying...';

      try {
        await api.post('/auth/verify-email', { otp: otpInput.value });
        user.email_verified = true;
        localStorage.setItem('user', JSON.stringify(user));
        showToast('Email verified!', 'success');
        goNext();
      } catch (err) {
        errorEl.textContent = apiErrorMessage(err, 'Could not verify that code.');
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify';
      }
    });

    let cooldown = 0;
    let cooldownTimer = null;
    const resendBtn = document.getElementById('resend-btn');

    function tickCooldown() {
      cooldown -= 1;
      if (cooldown <= 0) {
        clearInterval(cooldownTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend code';
      } else {
        resendBtn.textContent = `Resend code (${cooldown}s)`;
      }
    }

    resendBtn.addEventListener('click', async () => {
      resendBtn.disabled = true;
      try {
        await api.post('/auth/resend-otp', { purpose: 'email_verify' });
        showToast('A new code was sent to your email.', 'success');
        cooldown = 60;
        resendBtn.textContent = `Resend code (${cooldown}s)`;
        cooldownTimer = setInterval(tickCooldown, 1000);
      } catch (err) {
        showToast(apiErrorMessage(err, 'Could not resend the code.'), 'error');
        resendBtn.disabled = false;
      }
    });
