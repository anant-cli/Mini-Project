import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../lib/api.js';
import Button from '../components/Button.jsx';

// Color-coded pin per plan Section 3.1: green/red/yellow slot status.
const pinIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
});

const DEFAULT_CENTER = [28.6139, 77.2090]; // New Delhi, illustrative default

export default function DriverMap() {
  const [center] = useState(DEFAULT_CENTER);
  const [filters, setFilters] = useState({ vehicleType: '', evOnly: false, maxPrice: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/listings/search', {
        params: {
          lat: center[0], lng: center[1], radiusKm: 8,
          vehicleType: filters.vehicleType || undefined,
          evOnly: filters.evOnly || undefined,
          maxPrice: filters.maxPrice || undefined,
        },
      });
      setResults(data.results);
    } catch (err) {
      setError('Could not load nearby parking. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { search(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Find parking near you</h1>
      <p className="mt-1 text-sm text-ink/60">Pins turn red the instant a slot is booked — no refresh needed.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={filters.vehicleType}
          onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })}
          className="rounded-full border border-asphalt/15 px-4 py-2 text-sm"
        >
          <option value="">Any vehicle</option>
          <option value="two_wheeler">Two-wheeler</option>
          <option value="car">Car</option>
          <option value="suv">SUV</option>
          <option value="ev_car">EV car</option>
        </select>
        <input
          type="number" placeholder="Max ₹/hr" value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          className="w-28 rounded-full border border-asphalt/15 px-4 py-2 text-sm"
        />
        <label className="flex items-center gap-2 rounded-full border border-asphalt/15 px-4 py-2 text-sm">
          <input type="checkbox" checked={filters.evOnly}
            onChange={(e) => setFilters({ ...filters, evOnly: e.target.checked })} />
          EV charging only
        </label>
        <Button variant="primary" onClick={search} disabled={loading}>
          {loading ? 'Searching…' : 'Apply filters'}
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-cone">{error}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="h-[520px] overflow-hidden rounded-2xl border border-asphalt/10">
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {results.map((loc) => (
              <Marker
                key={loc.location_id}
                position={[loc.latitude, loc.longitude]}
                icon={pinIcon(loc.available_slots > 0 ? '#0E9A8C' : '#FF5F45')}
              >
                <Popup>
                  <div className="font-body text-sm">
                    <p className="font-semibold">{loc.name}</p>
                    <p className="text-ink/60">₹{loc.price_per_hour}/hr · {loc.available_slots} open</p>
                    {loc.has_ev_charging && <p className="text-signal-dark">EV charging available</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="space-y-3 overflow-y-auto lg:max-h-[520px]">
          {results.length === 0 && !loading && (
            <p className="rounded-xl border border-dashed border-asphalt/20 p-6 text-center text-sm text-ink/50">
              No listings found in this area yet. Try widening your filters.
            </p>
          )}
          {results.map((loc) => (
            <div key={loc.location_id} className="rounded-xl border border-asphalt/10 bg-white p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-display text-sm font-semibold text-ink">{loc.name}</h3>
                <span className="font-mono text-xs text-ink/50">{loc.distance_km.toFixed(1)} km</span>
              </div>
              <p className="mt-1 text-xs text-ink/60">{loc.address}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-signal-dark">₹{loc.price_per_hour}/hr</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${loc.available_slots > 0 ? 'bg-signal/10 text-signal-dark' : 'bg-cone/10 text-cone-dark'}`}>
                  {loc.available_slots > 0 ? `${loc.available_slots} slots open` : 'Full'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
