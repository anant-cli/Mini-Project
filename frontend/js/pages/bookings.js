    import api, { apiErrorMessage } from '/js/api.js';
    import { requireAuth } from '/js/auth.js';
    import { showToast } from '/js/toast.js';
    import { escapeHtml } from '/js/sanitize.js';

    const user = requireAuth(['driver']);
    if (user) document.getElementById('page-root').style.display = 'block';

    function money(n) { return `₹${Number(n || 0).toFixed(0)}`; }

    async function loadBookings() {
      const container = document.getElementById('bookings-list');
      try {
        const res = await api.get('/bookings/mine');
        const bookings = res.data.bookings || [];

        if (bookings.length === 0) {
          container.innerHTML = '<p class="text-muted">You have no bookings yet. <a href="/search.html">Find parking &rarr;</a></p>';
          return;
        }

        container.innerHTML = bookings.map((b) => `
          <div class="card list-card" style="padding:16px 20px;">
            <div class="list-card-row">
              <div>
                <strong>${escapeHtml(b.location_name)}</strong>
                <p class="text-sm text-muted">${escapeHtml(b.address)}</p>
                <p class="text-sm text-muted">${new Date(b.start_time).toLocaleString()} to ${new Date(b.end_time).toLocaleString()}</p>
                <p class="text-sm mt-2">${money(b.total_amount || b.estimated_amount)}${b.overtime_amount > 0 ? ` (incl. ${money(b.overtime_amount)} overtime)` : ''}</p>
                ${b.payment_status ? `<p class="text-sm text-muted">Payment: ${escapeHtml(b.payment_status)} &middot; Payout: ${escapeHtml(b.payout_status || 'held')}</p>` : ''}
                ${b.status === 'cancelled' ? `<p class="text-sm text-success mt-1" style="color:var(--color-teal-dark);">${money(b.total_amount || b.estimated_amount)} refunded to your original payment method</p>` : ''}
              </div>
              <span class="badge badge-${b.status}">${b.status.replace('_', ' ')}</span>
            </div>
            <div class="flex gap-2 mt-2" style="flex-wrap:wrap;">
              ${['pending', 'confirmed'].includes(b.status) ? `<button class="btn qr-btn" data-id="${b.booking_id}" style="padding:8px 16px; font-size:0.85rem;">Show QR Pass</button>` : ''}
              ${['pending', 'confirmed'].includes(b.status) ? `<button class="btn cancel-btn" data-id="${b.booking_id}" style="padding:8px 16px; font-size:0.85rem;">Cancel</button>` : ''}
              ${['confirmed', 'checked_in', 'completed'].includes(b.status) ? `<button class="btn dispute-btn" data-id="${b.booking_id}" style="padding:8px 16px; font-size:0.85rem;">Raise dispute</button>` : ''}
              ${b.status === 'completed' && !b.location_review_id ? `<button class="btn review-btn" data-id="${b.booking_id}" style="padding:8px 16px; font-size:0.85rem;">Leave a review</button>` : ''}
            </div>
          </div>
        `).join('');

        container.querySelectorAll('.qr-btn').forEach((btn) => btn.addEventListener('click', () => showQr(btn.dataset.id)));
        container.querySelectorAll('.cancel-btn').forEach((btn) => btn.addEventListener('click', () => cancelBooking(btn.dataset.id)));
        container.querySelectorAll('.dispute-btn').forEach((btn) => btn.addEventListener('click', () => raiseDispute(btn.dataset.id)));
        container.querySelectorAll('.review-btn').forEach((btn) => btn.addEventListener('click', () => leaveReview(btn.dataset.id)));
      } catch (err) {
        container.innerHTML = `<p class="text-danger">${apiErrorMessage(err, 'Failed to load bookings.')}</p>`;
      }
    }

    async function showQr(bookingId) {
      try {
        const res = await api.get(`/bookings/${bookingId}/pass`);
        document.getElementById('qr-image').src = res.data.qr_pass;
        document.getElementById('qr-modal').style.display = 'flex';
      } catch (err) {
        showToast(apiErrorMessage(err), 'error');
      }
    }

    async function cancelBooking(bookingId) {
      if (!confirm('Cancel this booking?')) return;
      try {
        await api.patch(`/bookings/${bookingId}/cancel`);
        showToast('Booking cancelled.', 'success');
        loadBookings();
      } catch (err) {
        showToast(apiErrorMessage(err), 'error');
      }
    }

    async function raiseDispute(bookingId) {
      const reason = prompt('Briefly describe the issue with this booking.');
      if (!reason || !reason.trim()) return;
      try {
        await api.post('/payments/disputes', { booking_id: bookingId, reason: reason.trim() });
        showToast('Dispute submitted for admin review.', 'success');
        loadBookings();
      } catch (err) {
        showToast(apiErrorMessage(err), 'error');
      }
    }

    async function leaveReview(bookingId) {
      reviewBookingId = bookingId;
      reviewRating = 0;
      document.getElementById('review-comment').value = '';
      document.getElementById('review-submit').disabled = true;
      buildStarWidget(document.getElementById('review-star-widget'), (r) => {
        reviewRating = r;
        document.getElementById('review-submit').disabled = false;
      });
      document.getElementById('review-modal').style.display = 'flex';
    }

    document.getElementById('qr-close').addEventListener('click', () => {
      document.getElementById('qr-modal').style.display = 'none';
    });

    function buildStarWidget(container, onSelect) {
      container.innerHTML = '';
      let selected = 0;
      const stars = Array.from({ length: 5 }, (_, i) => {
        const span = document.createElement('span');
        span.textContent = '★';
        span.dataset.val = i + 1;
        span.style.cursor = 'pointer';
        container.appendChild(span);
        return span;
      });
      function paint(n) {
        stars.forEach((s) => s.classList.toggle('active', Number(s.dataset.val) <= n));
      }
      stars.forEach((s) => {
        s.addEventListener('mouseenter', () => paint(Number(s.dataset.val)));
        s.addEventListener('mouseleave', () => paint(selected));
        s.addEventListener('click', () => {
          selected = Number(s.dataset.val);
          paint(selected);
          onSelect(selected);
        });
      });
    }

    let reviewBookingId = null;
    let reviewRating = 0;

    document.getElementById('review-submit').addEventListener('click', async () => {
      const comment = document.getElementById('review-comment').value.trim() || undefined;
      try {
        await api.post('/reviews/location', { booking_id: reviewBookingId, rating: reviewRating, comment });
        showToast('Thanks for the review!', 'success');
        document.getElementById('review-modal').style.display = 'none';
        loadBookings();
      } catch (err) {
        showToast(apiErrorMessage(err), 'error');
      }
    });

    document.getElementById('review-cancel').addEventListener('click', () => {
      document.getElementById('review-modal').style.display = 'none';
    });

    if (user) loadBookings();
