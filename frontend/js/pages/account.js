    import api, { apiErrorMessage } from '/js/api.js';
    import { requireAuth, logout } from '/js/auth.js';
    import { showToast } from '/js/toast.js';
    import { escapeHtml } from '/js/sanitize.js';

    const user = requireAuth();
    if (user) document.getElementById('page-root').style.display = 'block';

    const ROLE_LABELS = {
      driver: 'Driver',
      host: 'Host',
      business_host: 'Business Host',
      admin: 'Admin',
    };

    const ROLE_WARNINGS = {
      driver: 'All of your bookings, payments, reviews, and saved listings will be permanently deleted.',
      host: 'All of your listings, slots, and the bookings made on them will be permanently deleted.',
      business_host: 'All of your listings, slots, and the bookings made on them will be permanently deleted.',
      admin: 'Your admin account will be permanently removed.',
    };

    function renderAccount() {
      document.getElementById('acct-name').textContent = user.name;
      document.getElementById('acct-email').textContent = user.email;
      document.getElementById('acct-role').textContent = ROLE_LABELS[user.role] || user.role;
      document.getElementById('acct-created').textContent = user.created_at
        ? new Date(user.created_at).toLocaleDateString()
        : '—';
      document.getElementById('danger-copy').textContent =
        `This permanently deletes your account and everything tied to it — ${ROLE_WARNINGS[user.role] || ''} This cannot be undone.`;
      document.getElementById('delete-warning').textContent = ROLE_WARNINGS[user.role] || '';
    }

    if (user) renderAccount();

    const CONSENT_LABELS = {
      host: 'I declare that I own this place or have the legal right to list it, and I consent to ParkSlot verifying my identity.',
      business_host: 'I declare that I own this place or have the legal right to list it, and I consent to ParkSlot verifying my identity.',
      driver: 'I confirm I am parking my own vehicle at my own decision and responsibility, and I consent to ParkSlot verifying my identity.',
    };

    const KYC_BADGE_CLASS = {
      unsubmitted: 'badge-pending',
      pending: 'badge-pending',
      approved: 'badge-available',
      rejected: 'badge-cancelled',
    };
    const KYC_BADGE_LABEL = {
      unsubmitted: 'Not submitted',
      pending: 'Pending review',
      approved: 'Verified',
      rejected: 'Rejected',
    };
    const KYC_COPY = {
      unsubmitted: 'Verify your identity with an ID photo and a selfie so hosts and drivers can trust your account.',
      pending: 'Your documents are with our admin team for review — this usually takes a short while.',
      approved: 'Your identity has been verified.',
      rejected: 'Your last submission was rejected. You can resubmit below.',
    };
    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the selected file'));
        reader.readAsDataURL(file);
      });
    }

    async function loadKyc() {
      if (!user || user.role === 'admin') {
        document.getElementById('kyc-card').style.display = 'none';
        return;
      }
      try {
        const res = await api.get('/kyc/me');
        const { kyc_status: status } = res.data;
        document.getElementById('kyc-badge').textContent = KYC_BADGE_LABEL[status] || status;
        document.getElementById('kyc-badge').className = `badge ${KYC_BADGE_CLASS[status] || 'badge-pending'}`;
        document.getElementById('kyc-copy').textContent = KYC_COPY[status] || '';
        document.getElementById('kyc-consent-label').textContent = CONSENT_LABELS[user.role] || '';

        const form = document.getElementById('kyc-form');
        form.style.display = (status === 'unsubmitted' || status === 'rejected') ? 'block' : 'none';
      } catch (err) {
        document.getElementById('kyc-copy').textContent = apiErrorMessage(err, 'Could not load verification status.');
      }
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
        showToast('Submitted for review.', 'success');
        document.getElementById('kyc-form').reset();
        loadKyc();
      } catch (err) {
        errorEl.textContent = apiErrorMessage(err, 'Could not submit your documents.');
        errorEl.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit for review';
      }
    });

    if (user) loadKyc();

    const modal = document.getElementById('delete-modal');
    document.getElementById('open-delete').addEventListener('click', () => {
      document.getElementById('delete-password').value = '';
      document.getElementById('delete-error').style.display = 'none';
      modal.style.display = 'flex';
    });
    document.getElementById('cancel-delete').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    document.getElementById('confirm-delete').addEventListener('click', async () => {
      const password = document.getElementById('delete-password').value;
      const errorEl = document.getElementById('delete-error');
      const btn = document.getElementById('confirm-delete');
      if (!password) {
        errorEl.textContent = 'Enter your password to confirm.';
        errorEl.style.display = 'block';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Deleting...';
      try {
        await api.delete('/auth/me', { data: { password } });
        showToast('Your account has been deleted.', 'success');
        setTimeout(() => logout(), 800);
      } catch (err) {
        errorEl.textContent = apiErrorMessage(err, 'Could not delete your account.');
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Permanently delete my account';
      }
    });
