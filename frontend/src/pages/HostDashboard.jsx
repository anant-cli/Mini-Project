import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import Button from '../components/Button.jsx';
import SlotStatusGrid from '../components/SlotStatusGrid.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

const emptyListing = {
  name: '', address: '', latitude: '', longitude: '',
  total_slots: 1, price_per_hour: '',
  vehicle_types_allowed: ['car'], has_ev_charging: false,
  operating_hours: { open: '08:00', close: '22:00' },
};

const VEHICLE_OPTIONS = [
  { value: 'car',           label: '🚗 Car' },
  { value: 'suv',           label: '🚙 SUV' },
  { value: 'two_wheeler',   label: '🏍 Two-wheeler' },
  { value: 'ev_car',        label: '⚡ EV car' },
  { value: 'ev_two_wheeler',label: '⚡ EV two-wheeler' },
];

export default function HostDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState(emptyListing);
  const [evForm, setEvForm] = useState({ connector_type: 'Type-2', current_type: 'AC', power_kw: '7', price_per_kwh: '8' });
  const [creating, setCreating] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [activeTab, setActiveTab] = useState('listings'); // listings | new | scanner
  const [earnings, setEarnings] = useState({ total: 0, pending: 0, bookings: 0 });

  /* ── Load data ── */
  const loadListings = async () => {
    try {
      const { data } = await api.get('/listings/mine');
      setListings(data.listings || []);
    } catch {
      setListings([]);
    }
  };

  const loadEarnings = async () => {
    try {
      const { data } = await api.get('/bookings/host');
      const completed = (data.bookings || []).filter((b) => b.status === 'completed');
      const total = completed.reduce((s, b) => s + Number(b.total_amount || 0), 0);
      setEarnings({ total, pending: total * 0.15, bookings: completed.length });
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (user) { loadListings(); loadEarnings(); }
    /* eslint-disable-next-line */
  }, [user]);

  /* ── Toggle vehicle type ── */
  const toggleVehicle = (v) => {
    const cur = form.vehicle_types_allowed;
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    if (next.length > 0) setForm({ ...form, vehicle_types_allowed: next });
  };

  /* ── Create listing ── */
  const createListing = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        ...form,
        latitude:    Number(form.latitude),
        longitude:   Number(form.longitude),
        total_slots: Number(form.total_slots),
        price_per_hour: Number(form.price_per_hour),
      };
      const { data } = await api.post('/listings', payload);

      // If EV is checked, also create charger
      if (form.has_ev_charging) {
        try {
          await api.post('/ev-chargers', {
            location_id: data.location.location_id,
            connector_type: evForm.connector_type,
            current_type: evForm.current_type,
            power_kw: Number(evForm.power_kw),
            price_per_kwh: Number(evForm.price_per_kwh),
          });
        } catch {
          toast.info('Listing created. EV charger details could not be saved — add them later.');
        }
      }

      setForm(emptyListing);
      toast.success('Listing submitted for admin verification!');
      setActiveTab('listings');
      await loadListings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create listing');
    } finally {
      setCreating(false);
    }
  };

  /* ── QR check-in/out ── */
  const scanAction = async (action) => {
    setScanError(''); setScanResult(null);
    try {
      const endpoint = action === 'checkin' ? '/bookings/checkin' : '/bookings/checkout';
      const { data } = await api.post(endpoint, { qr_token: qrToken });
      setScanResult({ type: action, data });
      toast.success(action === 'checkin' ? 'Driver checked in!' : 'Driver checked out — payout released.');
    } catch (err) {
      const msg = err.response?.data?.error || `${action === 'checkin' ? 'Check-in' : 'Check-out'} failed`;
      setScanError(msg);
      toast.error(msg);
    }
  };

  const tabs = [
    { id: 'listings', label: 'My listings' },
    { id: 'new',      label: '+ New listing' },
    { id: 'scanner',  label: '🔲 Gate scanner' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-ink">Host dashboard</h1>
      <p className="mt-1 text-sm text-ink/55">List a space, scan drivers in and out, and track payouts.</p>

      {/* ── Earnings summary ── */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total earned', value: `₹${earnings.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-signal-dark' },
          { label: 'Platform fee (15%)', value: `₹${(earnings.total * 0.15).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-meter' },
          { label: 'Completed bookings', value: earnings.bookings, color: 'text-ink' },
        ].map((s) => (
          <div key={s.label} className="card">
            <p className="font-mono text-xs uppercase tracking-wide text-ink/45">{s.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="mt-8 flex gap-1 rounded-xl border border-asphalt/10 bg-asphalt/4 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={[
              'rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeTab === t.id
                ? 'bg-white text-ink shadow-sm'
                : 'text-ink/55 hover:text-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: My Listings ─── */}
      {activeTab === 'listings' && (
        <section className="mt-6">
          {listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-asphalt/20 p-12 text-center">
              <p className="font-display text-lg font-semibold text-ink/50">No listings yet</p>
              <p className="mt-2 text-sm text-ink/40">Create your first listing to start earning.</p>
              <Button variant="primary" className="mt-4" onClick={() => setActiveTab('new')}>
                + Create a listing
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <div key={l.location_id} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-sm font-semibold text-ink">{l.name}</h3>
                    <span className={`badge shrink-0 ${l.is_verified ? 'badge-green' : 'badge-amber'}`}>
                      {l.is_verified ? 'Live' : 'Pending'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink/55">{l.address}</p>
                  <p className="mt-3 font-mono text-sm font-semibold text-signal-dark">₹{l.price_per_hour}/hr</p>

                  <div className="mt-3">
                    <SlotStatusGrid rows={2} cols={Math.min(l.total_slots, 10)} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    {(Array.isArray(l.vehicle_types_allowed) ? l.vehicle_types_allowed : []).map((v) => (
                      <span key={v} className="badge badge-gray">{v.replace('_', ' ')}</span>
                    ))}
                    {l.has_ev_charging && <span className="badge badge-green">⚡ EV</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── TAB: New Listing ─── */}
      {activeTab === 'new' && (
        <section className="mt-6">
          <div className="card max-w-2xl">
            <h2 className="font-display text-lg font-semibold text-ink">List a new space</h2>
            <p className="mt-1 text-sm text-ink/50">New listings go live once an admin verifies ownership.</p>

            <form onSubmit={createListing} className="mt-5 space-y-4">
              {/* Name */}
              <div>
                <label className="input-label" htmlFor="lst-name">Listing name</label>
                <input id="lst-name" required className="input" placeholder="e.g. Vikram's Driveway, Sector 14"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              {/* Address */}
              <div>
                <label className="input-label" htmlFor="lst-addr">Address</label>
                <input id="lst-addr" required className="input" placeholder="Full address"
                  value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label" htmlFor="lst-lat">Latitude</label>
                  <input id="lst-lat" required type="number" step="any" className="input" placeholder="28.6139"
                    value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                </div>
                <div>
                  <label className="input-label" htmlFor="lst-lng">Longitude</label>
                  <input id="lst-lng" required type="number" step="any" className="input" placeholder="77.2090"
                    value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
                </div>
              </div>
              <p className="text-xs text-ink/40">
                💡 Right-click on{' '}
                <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">
                  OpenStreetMap
                </a>{' '}
                and choose "Show address" to find your coordinates.
              </p>

              {/* Slots & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label" htmlFor="lst-slots">Total slots</label>
                  <input id="lst-slots" required type="number" min="1" className="input"
                    value={form.total_slots} onChange={(e) => setForm({ ...form, total_slots: e.target.value })} />
                </div>
                <div>
                  <label className="input-label" htmlFor="lst-price">Price / hour (₹)</label>
                  <input id="lst-price" required type="number" step="any" min="1" className="input" placeholder="50"
                    value={form.price_per_hour} onChange={(e) => setForm({ ...form, price_per_hour: e.target.value })} />
                </div>
              </div>

              {/* Operating hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label" htmlFor="lst-open">Opening time</label>
                  <input id="lst-open" type="time" className="input"
                    value={form.operating_hours.open}
                    onChange={(e) => setForm({ ...form, operating_hours: { ...form.operating_hours, open: e.target.value } })} />
                </div>
                <div>
                  <label className="input-label" htmlFor="lst-close">Closing time</label>
                  <input id="lst-close" type="time" className="input"
                    value={form.operating_hours.close}
                    onChange={(e) => setForm({ ...form, operating_hours: { ...form.operating_hours, close: e.target.value } })} />
                </div>
              </div>

              {/* Vehicle types */}
              <div>
                <label className="input-label">Accepted vehicle types</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {VEHICLE_OPTIONS.map((v) => (
                    <button
                      key={v.value} type="button"
                      onClick={() => toggleVehicle(v.value)}
                      aria-pressed={form.vehicle_types_allowed.includes(v.value)}
                      className={[
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                        form.vehicle_types_allowed.includes(v.value)
                          ? 'border-signal bg-signal text-white'
                          : 'border-asphalt/15 text-ink/60 hover:border-signal/40',
                      ].join(' ')}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* EV charging toggle */}
              <div>
                <label className="flex cursor-pointer items-center gap-3">
                  <div className="relative">
                    <input
                      type="checkbox" className="sr-only"
                      checked={form.has_ev_charging}
                      onChange={(e) => setForm({ ...form, has_ev_charging: e.target.checked })}
                    />
                    <div className={`h-6 w-11 rounded-full transition-colors ${form.has_ev_charging ? 'bg-signal' : 'bg-asphalt/20'}`} />
                    <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.has_ev_charging ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm font-medium text-ink">This location has EV charging</span>
                </label>
              </div>

              {/* EV charger sub-form */}
              {form.has_ev_charging && (
                <div className="rounded-xl border border-signal/30 bg-signal/5 p-4 space-y-3 animate-fade-in">
                  <p className="eyebrow-dark">EV charger details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="input-label" htmlFor="ev-connector">Connector type</label>
                      <select id="ev-connector" className="input"
                        value={evForm.connector_type}
                        onChange={(e) => setEvForm({ ...evForm, connector_type: e.target.value })}>
                        {['Type-1', 'Type-2', 'CCS', 'CHAdeMO'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="input-label" htmlFor="ev-current">Current type</label>
                      <select id="ev-current" className="input"
                        value={evForm.current_type}
                        onChange={(e) => setEvForm({ ...evForm, current_type: e.target.value })}>
                        <option value="AC">AC</option>
                        <option value="DC">DC</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label" htmlFor="ev-kw">Power (kW)</label>
                      <input id="ev-kw" type="number" step="0.1" className="input" placeholder="7"
                        value={evForm.power_kw}
                        onChange={(e) => setEvForm({ ...evForm, power_kw: e.target.value })} />
                    </div>
                    <div>
                      <label className="input-label" htmlFor="ev-kwh">Price / kWh (₹)</label>
                      <input id="ev-kwh" type="number" step="0.5" className="input" placeholder="8"
                        value={evForm.price_per_kwh}
                        onChange={(e) => setEvForm({ ...evForm, price_per_kwh: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" loading={creating} className="w-full">
                {creating ? 'Submitting…' : 'Submit for verification'}
              </Button>
            </form>
          </div>
        </section>
      )}

      {/* ─── TAB: Gate Scanner ─── */}
      {activeTab === 'scanner' && (
        <section className="mt-6 max-w-lg">
          <div className="card">
            <h2 className="font-display text-lg font-semibold text-ink">Gate check-in / check-out</h2>
            <p className="mt-1 text-sm text-ink/55">
              Paste or type the driver's QR token (from a camera scanner in production).
            </p>

            <div className="mt-5">
              <label className="input-label" htmlFor="qr-token">QR token</label>
              <input
                id="qr-token"
                className="input font-mono"
                placeholder="Paste QR token here"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
              />
            </div>

            <div className="mt-3 flex gap-3">
              <Button
                variant="primary" onClick={() => scanAction('checkin')}
                disabled={!qrToken} className="flex-1"
              >
                ↓ Check in
              </Button>
              <Button
                variant="dark" onClick={() => scanAction('checkout')}
                disabled={!qrToken} className="flex-1"
              >
                ↑ Check out
              </Button>
            </div>

            {scanError && (
              <div className="mt-4 rounded-xl border border-cone/30 bg-cone/8 p-3 text-sm text-cone">
                {scanError}
              </div>
            )}

            {scanResult && (
              <div className="mt-4 animate-scale-in rounded-xl border border-signal/30 bg-signal/8 p-4 font-mono text-sm text-signal-dark">
                {scanResult.type === 'checkin' ? (
                  <div>
                    <p className="font-semibold">✓ Checked in</p>
                    <p className="mt-1 text-xs text-signal-dark/70">
                      Billing clock started at{' '}
                      {new Date(scanResult.data.booking.checkin_time).toLocaleTimeString('en-IN')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold">✓ Checked out</p>
                    <p className="mt-1 text-xs">
                      Total: ₹{scanResult.data.booking.total_amount}
                      {scanResult.data.booking.overtime_amount > 0 && (
                        <span className="text-meter"> (+₹{scanResult.data.booking.overtime_amount} overtime)</span>
                      )}
                    </p>
                    <p className="text-xs text-signal-dark/70 mt-0.5">
                      Your payout: ₹{scanResult.data.hostPayout} (after 15% platform fee)
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 rounded-xl bg-asphalt/5 p-4 text-xs text-ink/50">
              <p className="font-semibold text-ink/70 mb-2">How it works</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Driver shows you their QR pass from the ParkShare app</li>
                <li>Scan it with a barcode scanner or copy the token</li>
                <li>Click "Check in" when they arrive — billing clock starts</li>
                <li>Click "Check out" when they leave — final bill computed, payout released</li>
              </ol>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
