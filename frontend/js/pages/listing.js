    import api, { apiErrorMessage } from '/js/api.js';
    import { requireAuth } from '/js/auth.js';
    import { showToast } from '/js/toast.js';
    import { escapeHtml } from '/js/sanitize.js';
    import { watchLocations, onSlotUpdated } from '/js/socket.js';

    const user = requireAuth();
    const urlParams = new URLSearchParams(window.location.search);
    const listingId = urlParams.get('id');
    const root = document.getElementById('page-root');

    const VEHICLE_LABELS = {
      two_wheeler: 'Two-wheeler', car: 'Car', suv: 'SUV',
      ev_car: 'EV Car', ev_two_wheeler: 'EV Two-wheeler',
    };

    let currentSlots = [];
    let pricePerHour = 0;

    function money(n) { return `₹${Number(n || 0).toFixed(0)}`; }

    async function loadListing() {
      if (!listingId) {
        root.innerHTML = '<div class="card state-msg">Listing not found.</div>';
        return;
      }
      try {
        const res = await api.get(`/listings/${listingId}`);
        const { location, slots, ev_chargers } = res.data;
        pricePerHour = Number(location.price_per_hour);
        currentSlots = slots;

        const tpl = document.getElementById('listing-template').content.cloneNode(true);
        tpl.querySelector('[data-field="name"]').textContent = location.name;
        tpl.querySelector('[data-field="address"]').textContent = location.address;
        tpl.querySelector('[data-field="host_name"]').textContent = location.host_name || 'a ParkSlot host';
        tpl.querySelector('[data-field="price"]').textContent = `${money(pricePerHour)}/hr`;
        tpl.querySelector('[data-field="vehicle-types"]').textContent =
          (location.vehicle_types_allowed || []).map((v) => VEHICLE_LABELS[v] || v).join(', ') || 'Car';
        const hours = location.operating_hours || {};
        tpl.querySelector('[data-field="hours"]').textContent =
          hours.open && hours.close ? `${hours.open} to ${hours.close}` : '24 hours';
        if (location.avg_rating) {
          tpl.querySelector('[data-field="rating"]').innerHTML = `⭐ ${location.avg_rating} <span class="text-muted text-sm">(${location.review_count})</span>`;
        }

        const evBadge = tpl.querySelector('[data-field="ev-badge"]');
        if (location.has_ev_charging) {
          evBadge.textContent = 'EV Charging';
          evBadge.classList.add('badge-ev');
        } else {
          evBadge.remove();
        }

        root.innerHTML = '';
        root.appendChild(tpl);

        renderSlotGrid(slots);
        renderChargers(ev_chargers);
        renderSlotOptions(slots);
        loadReviews();
        setupFavoriteButton();
        setupBookingForm();

        watchLocations([listingId]);
      } catch (err) {
        root.innerHTML = `<div class="card state-msg text-danger">${apiErrorMessage(err, 'Could not load this listing.')}</div>`;
      }
    }

    function renderSlotGrid(slots) {
      const grid = document.getElementById('slot-grid');
      grid.innerHTML = slots.map((s) => `<div class="slot-cell ${s.status}" title="${s.slot_number} — ${s.status}">${s.slot_number}</div>`).join('');
    }

    function renderChargers(chargers) {
      const el = document.getElementById('ev-charger-list');
      if (!chargers || chargers.length === 0) { el.innerHTML = ''; return; }
      el.innerHTML = `<h3 class="font-semibold mt-4 mb-2">EV Chargers</h3>` + chargers.map((c) => `
        <div class="flex justify-between items-center text-sm mb-2">
          <span>${c.connector_type} &middot; ${c.current_type} &middot; ${c.power_kw}kW</span>
          <span class="badge badge-${c.status}">${c.status.replace('_', ' ')}</span>
        </div>
      `).join('');
    }

    function renderSlotOptions(slots) {
      const select = document.getElementById('slot-select');
      const available = slots.filter((s) => s.status === 'available');
      if (available.length === 0) {
        select.innerHTML = '<option value="">No slots available right now</option>';
        document.getElementById('book-submit').disabled = true;
        return;
      }
      select.innerHTML = available.map((s) =>
        `<option value="${s.slot_id}">${s.slot_number} (${VEHICLE_LABELS[s.vehicle_type] || s.vehicle_type})</option>`
      ).join('');
      document.getElementById('book-submit').disabled = false;
    }

    async function loadReviews() {
      try {
        const res = await api.get(`/reviews/location/${listingId}`);
        const reviews = res.data.reviews || [];
        const el = document.getElementById('reviews-list');
        if (reviews.length === 0) {
          el.innerHTML = '<p class="text-muted text-sm">No reviews yet.</p>';
          return;
        }
        el.innerHTML = reviews.map((r) => `
          <div class="card" style="padding:12px 16px;">
            <div class="flex justify-between">
              <strong>${escapeHtml(r.author_name)}</strong>
              <span>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
            </div>
            ${r.comment ? `<p class="text-sm text-muted mt-2">${escapeHtml(r.comment)}</p>` : ''}
          </div>
        `).join('');
      } catch (err) {
      }
    }

    function setupFavoriteButton() {
      const btn = document.getElementById('fav-btn');
      if (user.role !== 'driver') { btn.style.display = 'none'; return; }

      let saved = false;
      api.get('/favorites/ids').then((res) => {
        saved = (res.data.ids || []).includes(listingId);
        btn.innerHTML = saved ? '&#9829; Saved' : '&#9825; Save';
      }).catch(() => {});

      btn.addEventListener('click', async () => {
        try {
          if (saved) {
            await api.delete(`/favorites/${listingId}`);
            saved = false;
            showToast('Removed from saved listings.');
          } else {
            await api.post(`/favorites/${listingId}`);
            saved = true;
            showToast('Added to saved listings.', 'success');
          }
          btn.innerHTML = saved ? '&#9829; Saved' : '&#9825; Save';
        } catch (err) {
          showToast(apiErrorMessage(err), 'error');
        }
      });
    }

    function updateEstimate() {
      const start = document.getElementById('start-time').value;
      const end = document.getElementById('end-time').value;
      const estimate = document.getElementById('estimate');
      if (!start || !end) { estimate.textContent = ''; return; }
      const hours = (new Date(end) - new Date(start)) / 3600000;
      if (hours <= 0) { estimate.textContent = 'End time must be after start time.'; return; }
      estimate.textContent = `Estimated total: ${money(hours * pricePerHour)} (${hours.toFixed(1)} hrs)`;
    }

    function setupBookingForm() {
      if (user.role !== 'driver') {
        const bookingCard = document.getElementById('booking-form').closest('.card');
        bookingCard.innerHTML = `
          <h2 class="text-xl mb-4">Book this spot</h2>
          <p class="text-muted">
            ${user.role === 'admin'
              ? 'Admin accounts oversee the platform and don\'t book slots directly.'
              : 'Host accounts list parking spots — switch to a driver account to book one.'}
          </p>
        `;
        return;
      }

      const startInput = document.getElementById('start-time');
      function refreshMin() {
        const now = new Date();
        now.setSeconds(0, 0);
        startInput.min = now.toISOString().slice(0, 16);
      }
      refreshMin();
      startInput.addEventListener('focus', refreshMin);

      document.getElementById('start-time').addEventListener('input', updateEstimate);
      document.getElementById('end-time').addEventListener('input', updateEstimate);

      document.getElementById('booking-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (user.role !== 'driver') {
          showToast('Only driver accounts can book parking.', 'error');
          return;
        }

        const slotId = document.getElementById('slot-select').value;
        const vehicleNumber = document.getElementById('vehicle-number').value.trim();
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;

        if (!slotId) { showToast('No slot selected.', 'error'); return; }
        if (new Date(endTime) <= new Date(startTime)) {
          showToast('End time must be after start time.', 'error');
          return;
        }

        const submitBtn = document.getElementById('book-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Calculating...';

        try {
          const res = await api.post('/bookings/quote', {
            slot_id: slotId,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
          });
          const quote = res.data;

          document.getElementById('payment-summary').innerHTML = `
            <div class="flex justify-between mb-1"><span>Rate:</span> <span>${money(pricePerHour)}/hr</span></div>
            <div class="flex justify-between mb-1"><span>Duration:</span> <span>${quote.hours.toFixed(1)} hrs</span></div>
            <hr style="border-color:var(--color-border); margin:8px 0;" />
            <div class="flex justify-between font-bold"><span>Total:</span> <span>${money(quote.total_amount || quote.estimated_amount)}</span></div>
          `;

          document.getElementById('payment-modal').style.display = 'flex';

          document.getElementById('payment-form').onsubmit = async (pe) => {
            pe.preventDefault();
            const payBtn = document.getElementById('pay-submit');
            payBtn.disabled = true;
            payBtn.textContent = 'Processing payment...';

            await new Promise(r => setTimeout(r, 1500));

            payBtn.textContent = 'Payment Successful';
            payBtn.classList.replace('btn-primary', 'btn-success');

            await new Promise(r => setTimeout(r, 500));

            try {
              const bRes = await api.post('/bookings', {
                slot_id: slotId,
                vehicle_number: vehicleNumber,
                start_time: new Date(startTime).toISOString(),
                end_time: new Date(endTime).toISOString(),
              });
              document.getElementById('payment-modal').style.display = 'none';
              document.getElementById('qr-image').src = bRes.data.qr_pass;
              document.getElementById('qr-modal').style.display = 'flex';
            } catch (err) {
              showToast(apiErrorMessage(err, 'Could not create booking.'), 'error');
            } finally {
              payBtn.disabled = false;
              payBtn.textContent = 'Pay Now';
              payBtn.classList.replace('btn-success', 'btn-primary');
            }
          };

          document.getElementById('pay-cancel').onclick = () => {
            document.getElementById('payment-modal').style.display = 'none';
          };

        } catch (err) {
          showToast(apiErrorMessage(err, 'Could not get quote.'), 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Proceed to Pay';
        }
      });
    }

    document.getElementById('qr-close').addEventListener('click', () => {
      window.location.href = '/bookings.html';
    });

    onSlotUpdated(() => {
      api.get(`/listings/${listingId}`).then((res) => {
        currentSlots = res.data.slots;
        renderSlotGrid(currentSlots);
        renderSlotOptions(currentSlots);
      }).catch(() => {});
    });

    if (user) loadListing();
