    import api, { apiErrorMessage } from '/js/api.js';
    import { getUser, getToken } from '/js/auth.js';
    import { showToast } from '/js/toast.js';

    const user = getUser();
    if (!user || !getToken()) {
      window.location.href = '/login.html';
    } else if (!user.email_verified) {
      window.location.href = '/verify-email.html';
    } else if (user.kyc_status && user.kyc_status !== 'unsubmitted') {
      goToApp();
    }

    const CONSENT_LABELS = {
      host: 'I declare that I own this place or have the legal right to list it, and I consent to ParkSlot verifying my identity.',
      business_host: 'I declare that I own this place or have the legal right to list it, and I consent to ParkSlot verifying my identity.',
      driver: 'I confirm I am parking my own vehicle at my own decision and responsibility, and I consent to ParkSlot verifying my identity.',
    };
    document.getElementById('kyc-consent-label').textContent = CONSENT_LABELS[user?.role] || CONSENT_LABELS.driver;

    function goToApp() {
      if (['host', 'business_host'].includes(user.role)) window.location.href = '/host.html';
      else if (user.role === 'admin') window.location.href = '/admin.html';
      else window.location.href = '/search.html';
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the selected file'));
        reader.readAsDataURL(file);
      });
    }

    document.getElementById('kyc-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('kyc-error');
      errorEl.style.display = 'none';

      const idFile = document.getElementById('kyc-id-doc').files[0];
      const selfieFile = document.getElementById('kyc-selfie').files[0];
      if (!idFile || !selfieFile) {
        errorEl.textContent = 'Please choose both an ID photo and a selfie.';
        errorEl.style.display = 'block';
        return;
      }

      const submitBtn = document.getElementById('kyc-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        const [idDoc, selfie] = await Promise.all([fileToDataUrl(idFile), fileToDataUrl(selfieFile)]);
        await api.post('/kyc', {
          id_document_image: idDoc,
          selfie_image: selfie,
          consent: document.getElementById('kyc-consent').checked,
        });
        user.kyc_status = 'pending';
        localStorage.setItem('user', JSON.stringify(user));
        showToast('Identity documents submitted for review.', 'success');
        goToApp();
      } catch (err) {
        errorEl.textContent = apiErrorMessage(err, 'Could not submit your documents.');
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit & Continue';
      }
    });
