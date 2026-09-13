    import api, { apiErrorMessage } from '/js/api.js';
    import { requireAuth } from '/js/auth.js';
    import { showToast } from '/js/toast.js';
    import { escapeHtml } from '/js/sanitize.js';
    import { watchLocations, unwatchLocations, onSlotUpdated } from '/js/socket.js';
    import maplibregl from 'maplibre-gl';
    import 'maplibre-gl/dist/maplibre-gl.css';

    const currentUser = requireAuth(['driver']);
    if (currentUser) document.getElementById('page-root').style.display = 'block';

    if (currentUser) {

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('evOnly') === 'true') {
        document.getElementById('ev-only').checked = true;
      }

      let center = { lat: 12.9716, lng: 77.5946 };
      let driverLocation = null;
      const map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [center.lng, center.lat],
        zoom: 13
      });
      map.addControl(new maplibregl.NavigationControl());

      let lastMapData = { type: 'FeatureCollection', features: [] };

      map.on('load', () => {
        map.addSource('listings', {
          type: 'geojson',
          data: lastMapData,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });

        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'listings',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#299C87',
            'circle-radius': 18,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
          }
        });

        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'listings',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#ffffff'
          }
        });

        map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'listings',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#F0A93C',
            'circle-radius': 10,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          }
        });

        map.on('click', 'clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          const clusterId = features[0].properties.cluster_id;
          map.getSource('listings').getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          });
        });

        map.on('click', 'unclustered-point', (e) => {
          const coordinates = e.features[0].geometry.coordinates.slice();
          const props = e.features[0].properties;

          new maplibregl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
              <strong>${escapeHtml(props.name)}</strong><br>
              ${props.price_str} &middot; ${props.available_slots} available<br>
              <a href="/listing.html?id=${props.location_id}" style="color:var(--color-teal-dark); font-weight:bold;">View Details</a>
              &middot;
              <a href="#" data-route-lat="${coordinates[1]}" data-route-lng="${coordinates[0]}" class="popup-route-link" style="color:var(--color-teal-dark); font-weight:bold;">Route</a>
            `)
            .addTo(map);

          document.querySelectorAll('.popup-route-link').forEach((link) => {
            link.addEventListener('click', (ev) => {
              ev.preventDefault();
              showRouteTo(Number(link.dataset.routeLat), Number(link.dataset.routeLng));
            });
          });
        });

        map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
        map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });

        map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#299C87', 'line-width': 5, 'line-opacity': 0.85 }
        });
      });

      async function showRouteTo(lat, lng) {
        if (!driverLocation) {
          showToast('Turn on location access ("Use my location") first so we know your starting point.', 'error');
          return;
        }
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${driverLocation.lng},${driverLocation.lat};${lng},${lat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();
          const route = data.routes && data.routes[0];
          if (!route) {
            showToast('Could not find a route to that spot.', 'error');
            return;
          }

          map.getSource('route').setData({
            type: 'Feature',
            geometry: route.geometry,
            properties: {}
          });

          const distanceKm = (route.distance / 1000).toFixed(1);
          const durationMin = Math.round(route.duration / 60);
          document.getElementById('route-distance').textContent = `${distanceKm} km to this spot`;
          document.getElementById('route-duration').textContent = `~${durationMin} min drive`;
          document.getElementById('route-info').style.display = 'block';

          const coords = route.geometry.coordinates;
          const bounds = coords.reduce(
            (b, c) => b.extend(c),
            new maplibregl.LngLatBounds(coords[0], coords[0])
          );
          map.fitBounds(bounds, { padding: 60 });
        } catch {
          showToast('Could not fetch a route right now.', 'error');
        }
      }

      function clearRoute() {
        if (map.getSource('route')) {
          map.getSource('route').setData({ type: 'FeatureCollection', features: [] });
        }
        document.getElementById('route-info').style.display = 'none';
      }

      document.getElementById('clear-route-btn').addEventListener('click', clearRoute);

      let watchedIds = [];

      function priceStr(l) { return `₹${Number(l.price_per_hour).toFixed(0)}/hr`; }

      function ratingBadge(l) {
        if (!l.avg_rating) return '';
        return `<span style="font-size:0.8rem; color:var(--color-rating);">⭐ ${l.avg_rating} <span class="text-muted">(${l.review_count})</span></span>`;
      }

      function renderResults(listings) {
        const summary = document.getElementById('results-summary');
        const list = document.getElementById('results-list');
        summary.textContent = `${listings.length} spot${listings.length === 1 ? '' : 's'} found nearby`;

        if (listings.length === 0) {
          list.innerHTML = '<p class="text-muted text-sm">No parking found here. Try widening your search or removing filters.</p>';
          return;
        }

        list.innerHTML = listings.map((l) => `
          <div class="card list-card">
            <a href="/listing.html?id=${l.location_id}" style="display:block; text-decoration:none; color:inherit;">
              <div class="font-semibold">${escapeHtml(l.name)}</div>
              <div class="text-sm text-muted">${escapeHtml(l.address)}</div>
              <div class="flex justify-between items-center mt-2">
                <span class="badge ${Number(l.available_slots) > 0 ? 'badge-available' : 'badge-disabled'}">
                  ${l.available_slots} available
                </span>
                <span class="font-semibold">${priceStr(l)}</span>
              </div>
              ${l.avg_rating ? `<div class="mt-2">${ratingBadge(l)}</div>` : ''}
            </a>
            <button class="btn w-full mt-2 route-btn" style="padding:6px 12px; font-size:0.8rem;"
              data-lat="${l.latitude}" data-lng="${l.longitude}">Show route</button>
          </div>
        `).join('');

        document.querySelectorAll('.route-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            showRouteTo(Number(btn.dataset.lat), Number(btn.dataset.lng));
          });
        });
      }

      async function loadListings() {
        try {
          const params = {
            lat: center.lat,
            lng: center.lng,
            radiusKm: 15,
          };
          const vehicleType = document.getElementById('vehicle-filter').value;
          const maxPrice = document.getElementById('max-price').value;
          const evOnly = document.getElementById('ev-only').checked;
          if (vehicleType) params.vehicleType = vehicleType;
          if (maxPrice) params.maxPrice = maxPrice;
          if (evOnly) params.evOnly = 'true';

          const res = await api.get('/listings/search', { params });
          const listings = res.data.results || [];

          unwatchLocations(watchedIds);
          watchedIds = listings.map((l) => l.location_id);
          watchLocations(watchedIds);

          lastMapData = {
            type: 'FeatureCollection',
            features: listings.map((listing) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [Number(listing.longitude), Number(listing.latitude)]
              },
              properties: {
                location_id: listing.location_id,
                name: listing.name,
                available_slots: listing.available_slots,
                price_str: priceStr(listing)
              }
            }))
          };

          if (map.getSource('listings')) {
            map.getSource('listings').setData(lastMapData);
          }

          renderResults(listings);
        } catch (err) {
          showToast(apiErrorMessage(err, 'Could not load nearby parking.'), 'error');
        }
      }

      onSlotUpdated(({ slot_id, available_slots, status } = {}) => {
        loadListings();
      });

      document.getElementById('search-btn').addEventListener('click', loadListings);
      document.getElementById('vehicle-filter').addEventListener('change', loadListings);
      document.getElementById('ev-only').addEventListener('change', loadListings);

      document.getElementById('locate-btn').addEventListener('click', () => {
        if (!navigator.geolocation) {
          showToast('Geolocation is not supported by this browser.', 'error');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            driverLocation = { ...center };
            map.flyTo({ center: [center.lng, center.lat], zoom: 14 });
            loadListings();
          },
          () => showToast('Could not get your location. Using default area instead.', 'error')
        );
      });

      document.getElementById('location-search').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const query = e.target.value.trim();
        if (!query) return;
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data && data.length > 0) {
              center = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
              map.flyTo({ center: [center.lng, center.lat], zoom: 14 });
              loadListings();
            } else {
              showToast('No matching location found.', 'error');
            }
          })
          .catch(() => showToast('Location search failed.', 'error'));
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            driverLocation = { ...center };
            map.flyTo({ center: [center.lng, center.lat], zoom: 13 });
            loadListings();
          },
          () => loadListings(),
          { timeout: 4000 }
        );
      } else {
        loadListings();
      }
    }
