    import api, { apiErrorMessage } from '/js/api.js';
    import { requireAuth } from '/js/auth.js';
    import { showToast } from '/js/toast.js';
    import { escapeHtml } from '/js/sanitize.js';

    const user = requireAuth(['driver']);
    if (user) document.getElementById('page-root').style.display = 'block';

    function money(n) { return `₹${Number(n).toFixed(0)}`; }

    async function loadSaved() {
      const container = document.getElementById('saved-list');
      try {
        const res = await api.get('/favorites');
        const listings = res.data.favorites || [];

        if (listings.length === 0) {
          container.innerHTML = '<p class="text-muted">You have no saved listings yet. <a href="/search.html">Browse parking &rarr;</a></p>';
          return;
        }

        container.innerHTML = listings.map((l) => `
          <div class="card list-card" style="padding:16px 20px;" data-id="${l.location_id}">
            <div>
              <strong>${escapeHtml(l.name)}</strong>
              <p class="text-muted text-sm">${escapeHtml(l.address)}</p>
              <p class="text-sm mt-2">${money(l.price_per_hour)}/hr &middot; ${l.available_slots} available</p>
            </div>
            <div class="flex gap-2">
              <a href="/listing.html?id=${l.location_id}" class="btn btn-primary" style="padding:8px 16px; font-size:0.85rem;">View</a>
              <button class="btn remove-btn" data-id="${l.location_id}" style="padding:8px 16px; font-size:0.85rem;">Remove</button>
            </div>
          </div>
        `).join('');

        container.querySelectorAll('.remove-btn').forEach((btn) => {
          btn.addEventListener('click', async () => {
            try {
              await api.delete(`/favorites/${btn.dataset.id}`);
              showToast('Removed from saved listings.');
              loadSaved();
            } catch (err) {
              showToast(apiErrorMessage(err), 'error');
            }
          });
        });
      } catch (err) {
        container.innerHTML = `<p class="text-danger">${apiErrorMessage(err, 'Failed to load saved listings.')}</p>`;
      }
    }

    if (user) loadSaved();
