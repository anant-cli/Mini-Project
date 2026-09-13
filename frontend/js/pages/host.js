    import api, { apiErrorMessage } from '/js/api.js';
    import { requireAuth } from '/js/auth.js';
    import { showToast } from '/js/toast.js';
    import { escapeHtml } from '/js/sanitize.js';
    import { watchLocations, onSlotUpdated } from '/js/socket.js';
    import maplibregl from 'maplibre-gl';
    import 'maplibre-gl/dist/maplibre-gl.css';

    const user = requireAuth(['host', 'business_host']);
    if (user) document.getElementById('page-root').style.display = 'block';

    document.getElementById('add-listing-btn').addEventListener('click', () => {
      document.getElementById('add-listing-form').style.display = 'block';
      initListingMap();
    });
    document.getElementById('cancel-listing-btn').addEventListener('click', () => {
      document.getElementById('add-listing-form').style.display = 'none';
    });
    document.getElementById('has-ev').addEventListener('change', (e) => {
      document.getElementById('ev-fields').style.display = e.target.checked ? 'block' : 'none';
    });

    let listingMap = null;
    let listingMarker = null;

    function initListingMap() {
      if (listingMap) { listingMap.resize(); return; }

      const DEFAULT = [12.9716, 77.5946];
      listingMap = new maplibregl.Map({
        container: 'listing-map',
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [DEFAULT[1], DEFAULT[0]],
        zoom: 13
      });

      listingMarker = new maplibregl.Marker({ draggable: true })
        .setLngLat([DEFAULT[1], DEFAULT[0]])
        .addTo(listingMap);
      setLatLng(DEFAULT[0], DEFAULT[1]);

      listingMarker.on('dragend', () => {
        const lngLat = listingMarker.getLngLat();
        setLatLng(lngLat.lat, lngLat.lng);
      });

      listingMap.on('click', (e) => {
        listingMarker.setLngLat(e.lngLat);
        setLatLng(e.lngLat.lat, e.lngLat.lng);
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const ll = [pos.coords.longitude, pos.coords.latitude];
            listingMap.setCenter(ll);
            listingMap.setZoom(15);
            listingMarker.setLngLat(ll);
            setLatLng(pos.coords.latitude, pos.coords.longitude);
          },
          () => {}
        );
      }
    }

    function setLatLng(lat, lng) {
      document.getElementById('lat').value = lat.toFixed(6);
      document.getElementById('lng').value = lng.toFixed(6);
      document.getElementById('map-coords-display').textContent =
        `Selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    document.getElementById('map-search').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const q = e.target.value.trim();
      if (!q) return;
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data || data.length === 0) { showToast('No matching location found.', 'error'); return; }
          const ll = [Number(data[0].lon), Number(data[0].lat)];
          listingMap.setCenter(ll);
          listingMap.setZoom(15);
          listingMarker.setLngLat(ll);
          setLatLng(Number(data[0].lat), Number(data[0].lon));
        })
        .catch(() => showToast('Location search failed.', 'error'));
    });

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the selected file'));
        reader.readAsDataURL(file);
      });
    }

    document.getElementById('listing-photos').addEventListener('change', (e) => {
      const preview = document.getElementById('listing-photo-preview');
      preview.innerHTML = '';
      Array.from(e.target.files).slice(0, 5).forEach((file) => {
        const img = document.createElement('img');
        img.style.cssText = 'width:72px;height:72px;object-fit:cover;border-radius:8px;';
        fileToDataUrl(file).then((url) => { img.src = url; });
        preview.appendChild(img);
      });
    });

    function money(n) { return `₹${Number(n || 0).toFixed(0)}`; }

    let commissionPercent = 15;
    async function loadCommission() {
      try {
        const res = await api.get('/config');
        commissionPercent = Number(res.data.platform_commission_percent);
        document.getElementById('stat-earnings-label').textContent = `Est. Payout (after ${commissionPercent}% commission)`;
      } catch {
      }
    }

    async function loadListings() {
      const container = document.getElementById('host-listings');
      try {
        const res = await api.get('/listings/mine');
        const listings = res.data.listings || [];
        document.getElementById('stat-listings').textContent = listings.length;

        if (listings.length === 0) {
          container.innerHTML = '<p class="text-muted">You have no listings yet. Add one to get started.</p>';
          return;
        }

        container.innerHTML = listings.map((l) => `
          <div class="card" style="padding:18px 20px;" data-location="${l.location_id}">
            <div class="list-card-row">
              ${l.photos && l.photos[0] ? `<img src="${l.photos[0]}" alt="${escapeHtml(l.name)}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;margin-right:12px;" />` : ''}
              <div>
                <strong>${escapeHtml(l.name)}</strong>
                <p class="text-muted text-sm">${escapeHtml(l.address)}</p>
                <p class="text-sm mt-2">${money(l.price_per_hour)}/hr &middot; ${l.available_slots}/${l.total_slots} available</p>
              </div>
              <span class="badge ${l.is_verified ? 'badge-available' : 'badge-pending'}">${l.is_verified ? 'Verified' : 'Pending review'}</span>
            </div>
            <div class="slot-grid" data-slotgrid="${l.location_id}">
              ${(l.slots || []).map((s) => `<div class="slot-cell ${s.status}" title="${s.slot_number}">${s.slot_number}</div>`).join('')}
            </div>
          </div>
        `).join('');

        watchLocations(listings.map((l) => l.location_id));
      } catch (err) {
        container.innerHTML = `<p class="text-danger">${apiErrorMessage(err, 'Failed to load listings.')}</p>`;
      }
    }

    function refreshSlotGrid(locationId) {
      api.get(`/listings/${locationId}`).then((res) => {
        const el = document.querySelector(`[data-slotgrid="${locationId}"]`);
        if (!el) return;
        el.innerHTML = res.data.slots.map((s) =>
          `<div class="slot-cell ${s.status}" title="${s.slot_number}">${s.slot_number}</div>`
        ).join('');
      }).catch(() => {});
    }

    onSlotUpdated(() => {
      document.querySelectorAll('[data-slotgrid]').forEach((el) => refreshSlotGrid(el.dataset.slotgrid));
    });

    document.getElementById('has-ev').addEventListener('change', (e) => {
      const isEv = e.target.checked;
      document.getElementById('ev-connector').required = isEv;
      document.getElementById('ev-current').required = isEv;
      document.getElementById('ev-power').required = isEv;
      document.getElementById('ev-price').required = isEv;
    });

    document.getElementById('create-listing-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('create-submit');
      const errorEl = document.getElementById('listing-form-error');
      errorEl.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      const vehicleTypes = Array.from(document.querySelectorAll('input[name="vtype"]:checked')).map((cb) => cb.value);
      if (vehicleTypes.length === 0) {
        showToast('Select at least one vehicle type.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Listing';
        return;
      }

      const lat = document.getElementById('lat').value;
      const lng = document.getElementById('lng').value;
      if (!lat || !lng) {
        showToast('Pin a location on the map first.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Listing';
        return;
      }

      const photoFiles = Array.from(document.getElementById('listing-photos').files);
      if (photoFiles.length === 0) {
        errorEl.textContent = 'Please add at least one photo of the slot or place.';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Listing';
        return;
      }

      if (!document.getElementById('listing-ownership-consent').checked) {
        errorEl.textContent = 'Please confirm you own or are authorized to list this place.';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Listing';
        return;
      }

      const hasEv = document.getElementById('has-ev').checked;

      try {
        const photos = await Promise.all(photoFiles.slice(0, 5).map(fileToDataUrl));

        const res = await api.post('/listings', {
          name: document.getElementById('name').value.trim(),
          address: document.getElementById('address').value.trim(),
          latitude: Number(lat),
          longitude: Number(lng),
          total_slots: Number(document.getElementById('total-slots').value),
          price_per_hour: Number(document.getElementById('price').value),
          vehicle_types_allowed: vehicleTypes,
          has_ev_charging: hasEv,
          operating_hours: {
            open: document.getElementById('open-time').value,
            close: document.getElementById('close-time').value,
          },
          photos,
          ownership_consent: true,
        });

        const locationId = res.data.location.location_id;

        if (hasEv) {
          const power = document.getElementById('ev-power').value;
          const priceKwh = document.getElementById('ev-price').value;
          if (power && priceKwh) {
            await api.post('/ev-chargers', {
              location_id: locationId,
              connector_type: document.getElementById('ev-connector').value,
              current_type: document.getElementById('ev-current').value,
              power_kw: Number(power),
              price_per_kwh: Number(priceKwh),
            });
          }
        }

        showToast('Listing created! An admin will review it shortly.', 'success');
        document.getElementById('create-listing-form').reset();
        document.getElementById('listing-photo-preview').innerHTML = '';
        document.getElementById('add-listing-form').style.display = 'none';
        document.getElementById('ev-fields').style.display = 'none';
        document.getElementById('map-coords-display').textContent = 'No location selected yet.';
        listingMap = null;
        listingMarker = null;
        loadListings();
      } catch (err) {
        errorEl.textContent = apiErrorMessage(err, 'Failed to create listing.');
        errorEl.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Listing';
      }
    });

    async function loadBookings() {
      const container = document.getElementById('host-bookings');
      try {
        const res = await api.get('/bookings/host');
        const bookings = res.data.bookings || [];

        const completed = bookings.filter((b) => b.status === 'completed');
        document.getElementById('stat-bookings').textContent = completed.length;
        const gross = completed.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
        document.getElementById('stat-earnings').textContent = money(gross * (1 - commissionPercent / 100));

        if (bookings.length === 0) {
          container.innerHTML = '<p class="text-muted">No bookings yet.</p>';
          return;
        }

        container.innerHTML = bookings.map((b) => `
          <div class="card" style="padding:14px 18px;">
            <div class="list-card-row">
              <div>
                <strong>${escapeHtml(b.location_name)}</strong> &middot; Slot ${b.slot_number}
                <p class="text-sm text-muted">${escapeHtml(b.driver_name)} (${escapeHtml(b.driver_email)}) &middot; ${escapeHtml(b.vehicle_number)}</p>
                <p class="text-sm text-muted">${new Date(b.start_time).toLocaleString()} to ${new Date(b.end_time).toLocaleString()}</p>
                ${b.payment_status ? `<p class="text-sm text-muted">Payment: ${escapeHtml(b.payment_status)} &middot; Payout: ${escapeHtml(b.payout_status || 'held')}</p>` : ''}
              </div>
              <div class="text-center">
                <span class="badge badge-${b.status}">${b.status.replace('_', ' ')}</span>
                ${b.total_amount ? `<p class="text-sm mt-2">${money(b.total_amount)}</p>` : ''}
              </div>
            </div>
            ${b.status === 'completed' && !b.driver_review_id ? `
              <button class="btn mt-2 rate-driver-btn" data-booking="${b.booking_id}" style="padding:8px 16px; font-size:0.85rem;">Rate this driver</button>
            ` : ''}
          </div>
        `).join('');

        document.querySelectorAll('.rate-driver-btn').forEach((btn) => {
          btn.addEventListener('click', () => openDriverReviewModal(btn.dataset.booking));
        });
      } catch (err) {
        container.innerHTML = `<p class="text-danger">${apiErrorMessage(err, 'Failed to load bookings.')}</p>`;
      }
    }

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

    let driverReviewBookingId = null;
    let driverReviewRating = 0;

    function openDriverReviewModal(bookingId) {
      driverReviewBookingId = bookingId;
      driverReviewRating = 0;
      document.getElementById('driver-review-comment').value = '';
      document.getElementById('driver-review-submit').disabled = true;
      buildStarWidget(document.getElementById('driver-star-widget'), (r) => {
        driverReviewRating = r;
        document.getElementById('driver-review-submit').disabled = false;
      });
      document.getElementById('driver-review-modal').style.display = 'flex';
    }

    document.getElementById('driver-review-submit').addEventListener('click', async () => {
      const comment = document.getElementById('driver-review-comment').value.trim() || undefined;
      try {
        await api.post('/reviews/driver', {
          booking_id: driverReviewBookingId,
          rating: driverReviewRating,
          comment,
        });
        showToast('Review submitted.', 'success');
        document.getElementById('driver-review-modal').style.display = 'none';
        loadBookings();
      } catch (err) {
        showToast(apiErrorMessage(err), 'error');
      }
    });

    document.getElementById('driver-review-cancel').addEventListener('click', () => {
      document.getElementById('driver-review-modal').style.display = 'none';
    });

    async function handleScan(action) {
      const token = document.getElementById('qr-token-input').value.trim();
      const resultEl = document.getElementById('checkin-result');
      if (!token) { showToast('Enter a QR token first.', 'error'); return; }
      try {
        const res = await api.post(`/bookings/${action}`, { qr_token: token });
        if (action === 'checkout') {
          showToast(`Checked out. Driver paid ${money(res.data.booking.total_amount)}. Host payout ${money(res.data.hostPayout)}. Fee ${money(res.data.platformCut)}.`, 'success');
        } else {
          resultEl.textContent = `Checked in: ${res.data.booking.vehicle_number} - status ${res.data.booking.status}`;
          resultEl.className = 'text-sm mt-4 text-success';
          showToast('Success!', 'success');
        }
        document.getElementById('qr-token-input').value = '';
        loadListings();
        loadBookings();
      } catch (err) {
        resultEl.textContent = apiErrorMessage(err);
        resultEl.className = 'text-sm mt-4 text-danger';
      }
    }

    document.getElementById('checkin-btn').addEventListener('click', () => handleScan('checkin'));
    document.getElementById('checkout-btn').addEventListener('click', () => handleScan('checkout'));

    let activeQrScanner = null;

    document.getElementById('scan-qr-btn').addEventListener('click', async () => {
      try {
        const { default: QrScanner } = await import('qr-scanner');
        const video = document.getElementById('qr-video');
        const wrap = document.getElementById('qr-video-wrap');
        wrap.style.display = 'block';

        activeQrScanner = new QrScanner(
          video,
          (result) => {
            document.getElementById('qr-token-input').value = readQrToken(result.data);
            stopQrScanner();
            showToast('QR code scanned!', 'success');
          },
          { returnDetailedScanResult: true }
        );
        await activeQrScanner.start();
      } catch (err) {
        if (err && (err.name === 'NotAllowedError' || String(err).includes('permission'))) {
          showToast('Camera permission denied. Paste the token manually.', 'error');
        } else {
          showToast('Could not start camera scanner.', 'error');
        }
        stopQrScanner();
      }
    });

    function stopQrScanner() {
      if (activeQrScanner) { activeQrScanner.stop(); activeQrScanner.destroy(); activeQrScanner = null; }
      document.getElementById('qr-video-wrap').style.display = 'none';
    }

    function readQrToken(data) {
      try {
        const parsed = JSON.parse(data);
        return parsed.t || data;
      } catch {
        return data;
      }
    }

    document.getElementById('qr-reader-stop').addEventListener('click', stopQrScanner);

    if (user) {
      loadCommission().then(loadBookings);
      loadListings();
    }
