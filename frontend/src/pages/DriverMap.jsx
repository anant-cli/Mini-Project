import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import Button from '../components/Button.jsx';
import BookingModal from '../components/BookingModal.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { io } from 'socket.io-client';

/* ─── Map helpers ─────────────────────────────────────────────── */
const pinIcon = (color, count = '') =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:36px;height:36px">
        <div style="
          position:absolute;inset:0;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${color};border:2px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.35)
        "></div>
        <span style="
          position:absolute;inset:0;display:flex;align-items:center;
          justify-content:center;font-size:10px;font-weight:700;
          color:white;padding-bottom:4px
        ">${count}</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

/* ─── Mock data (demo when API is offline) ────────────────────── */
const MOCK_LOCATIONS = [
  {
    location_id: 'mock-1', name: 'Connaught Place Parking',
    address: 'Block A, Connaught Place, New Delhi', latitude: 28.6315, longitude: 77.2167,
    price_per_hour: 60, has_ev_charging: true, available_slots: 5, distance_km: 0.4,
    avg_rating: 4.7, vehicle_types_allowed: ['car', 'suv', 'ev_car'],
  },
  {
    location_id: 'mock-2', name: 'Rajiv Chowk Metro Lot',
    address: 'Near Metro Gate 3, Rajiv Chowk, New Delhi', latitude: 28.6330, longitude: 77.2195,
    price_per_hour: 40, has_ev_charging: false, available_slots: 12, distance_km: 0.7,
    avg_rating: 4.3, vehicle_types_allowed: ['car', 'two_wheeler'],
  },
  {
    location_id: 'mock-3', name: 'Palika Bazaar Underground',
    address: 'Palika Bazaar, New Delhi', latitude: 28.6288, longitude: 77.2200,
    price_per_hour: 80, has_ev_charging: true, available_slots: 0, distance_km: 1.1,
    avg_rating: 4.5, vehicle_types_allowed: ['car', 'suv'],
  },
  {
    location_id: 'mock-4', name: 'India Gate Visitor Parking',
    address: 'C-Hexagon, Kartavya Path, New Delhi', latitude: 28.6129, longitude: 77.2295,
    price_per_hour: 30, has_ev_charging: false, available_slots: 28, distance_km: 2.3,
    avg_rating: 4.1, vehicle_types_allowed: ['car', 'suv', 'two_wheeler'],
  },
  {
    location_id: 'mock-5', name: 'Saket Select CITYWALK',
    address: 'A-3, District Centre, Saket, New Delhi', latitude: 28.5254, longitude: 77.2194,
    price_per_hour: 100, has_ev_charging: true, available_slots: 3, distance_km: 11.5,
    avg_rating: 4.9, vehicle_types_allowed: ['car', 'suv', 'ev_car'],
  },
];

const MOCK_SLOTS = {
  'mock-1': [
    { slot_id: 'm1s1', slot_number: 'A1', status: 'available', vehicle_type: 'car' },
    { slot_id: 'm1s2', slot_number: 'A2', status: 'available', vehicle_type: 'car' },
    { slot_id: 'm1s3', slot_number: 'A3', status: 'booked',    vehicle_type: 'car' },
    { slot_id: 'm1s4', slot_number: 'B1', status: 'available', vehicle_type: 'suv' },
    { slot_id: 'm1s5', slot_number: 'EV1', status: 'available', vehicle_type: 'ev_car' },
    { slot_id: 'm1s6', slot_number: 'EV2', status: 'occupied',  vehicle_type: 'ev_car' },
  ],
  'mock-2': Array.from({ length: 12 }, (_, i) => ({
    slot_id: `m2s${i}`, slot_number: `P${i + 1}`, status: 'available', vehicle_type: i < 8 ? 'car' : 'two_wheeler',
  })),
  'mock-3': Array.from({ length: 8 }, (_, i) => ({
    slot_id: `m3s${i}`, slot_number: `B${i + 1}`, status: 'occupied', vehicle_type: 'car',
  })),
  'mock-4': Array.from({ length: 28 }, (_, i) => ({
    slot_id: `m4s${i}`, slot_number: `C${i + 1}`, status: i < 2 ? 'booked' : 'available', vehicle_type: 'car',
  })),
  'mock-5': [
    { slot_id: 'm5s1', slot_number: 'P1', status: 'available', vehicle_type: 'suv' },
    { slot_id: 'm5s2', slot_number: 'P2', status: 'available', vehicle_type: 'car' },
    { slot_id: 'm5s3', slot_number: 'EV1', status: 'available', vehicle_type: 'ev_car' },
    { slot_id: 'm5s4', slot_number: 'EV2', status: 'occupied',  vehicle_type: 'ev_car' },
  ],
};

const DEFAULT_CENTER = [28.6139, 77.2090];

/* ─── Map recenter helper ─────────────────────────────────────── */
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

/* ─── Stars display ───────────────────────────────────────────── */
function Stars({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 16 16" fill={i < Math.round(rating) ? '#F2A93B' : '#DDE2E8'} className="h-3 w-3" aria-hidden="true">
          <path d="M7.56 1.3a.5.5 0 0 1 .88 0l1.59 3.22 3.55.52a.5.5 0 0 1 .28.85l-2.57 2.5.61 3.54a.5.5 0 0 1-.73.53L8 10.6l-3.17 1.67a.5.5 0 0 1-.73-.53l.6-3.54-2.57-2.5a.5.5 0 0 1 .28-.85l3.56-.52L7.56 1.3Z" />
        </svg>
      ))}
      <span className="ml-1 font-mono text-[11px] text-ink/50">{rating?.toFixed(1)}</span>
    </span>
  );
}

/* ─── Main ────────────────────────────────────────────────────── */
export default function DriverMap() {
  const toast = useToast();
  const { user } = useAuth();
  const [center] = useState(DEFAULT_CENTER);
  const [filters, setFilters] = useState({ vehicleType: '', evOnly: false, maxPrice: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);

  // Booking modal state
  const [booking, setBooking] = useState(null); // { location, slots }

  // Socket ref
  const socketRef = useRef(null);
  const watchedIdsRef = useRef([]);

  /* Live slot updates via Socket.io */
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    try {
      const socket = io(apiBase, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.on('slot_updated', ({ location_id, available_slots }) => {
        setResults((prev) =>
          prev.map((loc) =>
            loc.location_id === location_id
              ? { ...loc, available_slots: Math.max(0, Number(available_slots ?? loc.available_slots)) }
              : loc
          )
        );
      });
      return () => socket.disconnect();
    } catch {
      // Backend offline — fine, we show mock data
    }
  }, []);

  /* Watch location rooms when results arrive */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || isMock) return;
    const ids = results.map((l) => l.location_id);
    const previousIds = watchedIdsRef.current;
    if (previousIds.length) socket.emit('unwatch_area', previousIds);
    watchedIdsRef.current = ids;
    socket.emit('watch_area', ids);
    return () => { socket.emit('unwatch_area', ids); };
  }, [results, isMock]);

  /* Search / filter */
  const search = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/listings/search', {
        params: {
          lat: center[0], lng: center[1], radiusKm: 20,
          vehicleType: filters.vehicleType || undefined,
          evOnly: filters.evOnly || undefined,
          maxPrice: filters.maxPrice || undefined,
        },
      });
      let r = data.results || [];
      if (filters.evOnly) r = r.filter((l) => l.has_ev_charging);
      if (filters.maxPrice) r = r.filter((l) => Number(l.price_per_hour) <= Number(filters.maxPrice));
      setResults(r);
      setIsMock(false);
    } catch (err) {
      // Only fall back to mock data when the backend is genuinely unreachable
      // (no response at all). A real 4xx/5xx means the backend IS up but
      // something's wrong — surface that instead of pretending we're offline.
      if (err.response) {
        toast.error(err.response.data?.error || 'Search failed. Please try again.');
        setLoading(false);
        return;
      }
      let mock = [...MOCK_LOCATIONS];
      if (filters.vehicleType) mock = mock.filter((l) => Array.isArray(l.vehicle_types_allowed) && l.vehicle_types_allowed.includes(filters.vehicleType));
      if (filters.evOnly)      mock = mock.filter((l) => l.has_ev_charging);
      if (filters.maxPrice)    mock = mock.filter((l) => l.price_per_hour <= Number(filters.maxPrice));
      setResults(mock);
      setIsMock(true);
    } finally {
      setLoading(false);
    }
  }, [center, filters]);

  useEffect(() => { search(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (user?.role !== 'driver') {
      setFavoriteIds([]);
      return;
    }
    api.get('/favorites/ids')
      .then(({ data }) => setFavoriteIds(data.ids || []))
      .catch(() => setFavoriteIds([]));
  }, [user?.role]);

  /* Open booking modal */
  const openBooking = async (loc) => {
    let slots = isMock ? (MOCK_SLOTS[loc.location_id] || []) : [];
    if (!isMock) {
      try {
        const { data } = await api.get(`/listings/${loc.location_id}`);
        slots = data.slots || [];
      } catch {
        toast.error('Could not load slot details.');
        return;
      }
    }
    setBooking({ location: loc, slots });
  };

  const toggleFavorite = async (loc, e) => {
    e.stopPropagation();
    if (isMock) {
      toast.info('Saved listings need the backend connection.');
      return;
    }
    if (!user) {
      toast.info('Log in as a driver to save listings.');
      return;
    }
    if (user.role !== 'driver') {
      toast.info('Only driver accounts can save listings.');
      return;
    }
    const isSaved = favoriteIds.includes(loc.location_id);
    try {
      if (isSaved) {
        await api.delete(`/favorites/${loc.location_id}`);
        setFavoriteIds((ids) => ids.filter((id) => id !== loc.location_id));
      } else {
        await api.post(`/favorites/${loc.location_id}`);
        setFavoriteIds((ids) => [...ids, loc.location_id]);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update saved listing.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Find parking near you</h1>
          <p className="mt-0.5 text-sm text-ink/55">
            {isMock ? (
              <span className="badge badge-amber">Demo mode — backend offline</span>
            ) : (
              'Pins update the instant a slot is booked — no refresh needed.'
            )}
          </p>
        </div>
        <Button as={Link} to="/bookings" variant="outline" size="sm">
          My bookings
        </Button>
      </div>

      {/* Filter bar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {/* Vehicle type */}
        <select
          value={filters.vehicleType}
          onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })}
          className="rounded-full border border-asphalt/15 bg-white px-4 py-2 text-sm text-ink outline-none focus:border-signal"
          aria-label="Filter by vehicle type"
        >
          <option value="">🚗 Any vehicle</option>
          <option value="two_wheeler">🏍 Two-wheeler</option>
          <option value="car">🚗 Car</option>
          <option value="suv">🚙 SUV</option>
          <option value="ev_car">⚡ EV car</option>
        </select>

        {/* Max price */}
        <input
          type="number" placeholder="Max ₹/hr" value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          className="w-28 rounded-full border border-asphalt/15 bg-white px-4 py-2 text-sm outline-none focus:border-signal"
          aria-label="Maximum price per hour"
        />

        {/* EV toggle */}
        <button
          onClick={() => setFilters({ ...filters, evOnly: !filters.evOnly })}
          className={[
            'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
            filters.evOnly
              ? 'border-signal bg-signal text-white'
              : 'border-asphalt/15 bg-white text-ink/70 hover:border-signal/40',
          ].join(' ')}
          aria-pressed={filters.evOnly}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.718a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .945-.143Z" clipRule="evenodd" />
          </svg>
          EV only
        </button>

        <Button variant="primary" size="sm" onClick={search} loading={loading}>
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </div>

      {/* Main content: map + sidebar */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Map */}
        <div className="h-[380px] overflow-hidden rounded-2xl border border-asphalt/10 shadow-sm sm:h-[460px] lg:h-[540px]">
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RecenterMap center={center} />
              {results.map((loc) => (
                <Marker
                  key={loc.location_id}
                  position={[loc.latitude, loc.longitude]}
                  icon={pinIcon(
                    loc.available_slots > 0 ? '#0E9A8C' : '#FF5F45',
                    loc.available_slots > 9 ? '9+' : loc.available_slots > 0 ? String(loc.available_slots) : '✕'
                  )}
                >
                  <Popup>
                    <div className="font-body text-sm min-w-[160px]">
                      <p className="font-semibold text-ink">{loc.name}</p>
                      <p className="text-xs text-ink/60 mt-0.5">{loc.address}</p>
                      <p className="mt-2 font-mono font-bold text-signal-dark">₹{loc.price_per_hour}/hr</p>
                      <p className="text-xs text-ink/60">{loc.available_slots} slots open</p>
                      {loc.has_ev_charging && (
                        <p className="mt-1 text-xs font-medium text-signal-dark">⚡ EV charging</p>
                      )}
                      <button
                        onClick={() => openBooking(loc)}
                        disabled={loc.available_slots === 0}
                        className="mt-2 w-full rounded-lg bg-signal px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-signal-dark transition-colors"
                      >
                        {loc.available_slots > 0 ? 'Book this slot' : 'No slots available'}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Results sidebar */}
          <div className="flex flex-col gap-3 lg:max-h-[540px] lg:overflow-y-auto">
            {loading && (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-asphalt/8 p-4">
                    <div className="skeleton h-4 w-3/4 mb-2" />
                    <div className="skeleton h-3 w-1/2 mb-3" />
                    <div className="skeleton h-8 w-full" />
                  </div>
                ))}
              </>
            )}
            {!loading && results.length === 0 && (
              <div className="rounded-2xl border border-dashed border-asphalt/20 p-8 text-center">
                <p className="text-sm text-ink/50">No listings found. Try widening your filters.</p>
              </div>
            )}
            {results.map((loc) => (
              <div
                key={loc.location_id}
                className="card cursor-pointer hover:border-signal/40 transition-all"
                onClick={() => openBooking(loc)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openBooking(loc)}
                aria-label={`Book at ${loc.name}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sm font-semibold text-ink truncate">{loc.name}</h3>
                      {loc.has_ev_charging && (
                        <span className="badge badge-green shrink-0">⚡ EV</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-ink/55 truncate">{loc.address}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs text-ink/45">{Number(loc.distance_km).toFixed(1)} km</span>
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(loc, e)}
                      className={`rounded-full border p-1.5 transition-colors ${favoriteIds.includes(loc.location_id) ? 'border-cone bg-cone/8 text-cone' : 'border-asphalt/15 text-ink/40 hover:border-cone/40 hover:text-cone'}`}
                      aria-label={favoriteIds.includes(loc.location_id) ? 'Remove from saved listings' : 'Save listing'}
                    >
                      <svg viewBox="0 0 24 24" fill={favoriteIds.includes(loc.location_id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0 6.25-9 11-9 11s-9-4.75-9-11A5.25 5.25 0 0 1 12 4.5a5.25 5.25 0 0 1 9 3.75Z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-lg font-bold text-signal-dark">₹{loc.price_per_hour}</span>
                    <span className="text-xs text-ink/45">/hr</span>
                  </div>
                  <Stars rating={loc.avg_rating ?? 4.5} />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className={`badge ${loc.available_slots > 0 ? 'badge-green' : 'badge-red'}`}>
                    {loc.available_slots > 0 ? `${loc.available_slots} open` : 'Full'}
                  </span>
                  <Button
                    variant="primary" size="sm"
                    disabled={loc.available_slots === 0}
                    onClick={(e) => { e.stopPropagation(); openBooking(loc); }}
                  >
                    Book
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Booking modal */}
      {booking && (
        <BookingModal
          location={booking.location}
          slots={booking.slots}
          onClose={() => setBooking(null)}
        />
      )}
    </div>
  );
}
