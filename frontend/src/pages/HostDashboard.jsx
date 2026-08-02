import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import Button from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyListing = {
  name: '', address: '', latitude: '', longitude: '', total_slots: 1,
  price_per_hour: '', vehicle_types_allowed: ['car'], has_ev_charging: false,
};

export default function HostDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState(emptyListing);
  const [creating, setCreating] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');

  const loadListings = async () => {
    const { data } = await api.get('/listings/mine');
    setListings(data.listings);
  };

  useEffect(() => { if (user) loadListings(); /* eslint-disable-next-line */ }, [user]);

  const createListing = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/listings', {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        total_slots: Number(form.total_slots),
        price_per_hour: Number(form.price_per_hour),
      });
      setForm(emptyListing);
      await loadListings();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not create listing');
    } finally {
      setCreating(false);
    }
  };

  const scanCheckin = async () => {
    setScanError(''); setScanResult(null);
    try {
      const { data } = await api.post('/bookings/checkin', { qr_token: qrToken });
      setScanResult({ type: 'checkin', data });
    } catch (err) {
      setScanError(err.response?.data?.error || 'Check-in failed');
    }
  };

  const scanCheckout = async () => {
    setScanError(''); setScanResult(null);
    try {
      const { data } = await api.post('/bookings/checkout', { qr_token: qrToken });
      setScanResult({ type: 'checkout', data });
    } catch (err) {
      setScanError(err.response?.data?.error || 'Check-out failed');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Host dashboard</h1>
      <p className="mt-1 text-sm text-ink/60">List a space, scan drivers in and out at the gate, and track payouts.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Listing creation */}
        <section className="rounded-2xl border border-asphalt/10 bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink">List a new space</h2>
          <form onSubmit={createListing} className="mt-4 space-y-3">
            <input required placeholder="Listing name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-asphalt/15 px-4 py-2.5 text-sm" />
            <input required placeholder="Address" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-lg border border-asphalt/15 px-4 py-2.5 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input required type="number" step="any" placeholder="Latitude" value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="rounded-lg border border-asphalt/15 px-4 py-2.5 text-sm" />
              <input required type="number" step="any" placeholder="Longitude" value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="rounded-lg border border-asphalt/15 px-4 py-2.5 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required type="number" min="1" placeholder="Total slots" value={form.total_slots}
                onChange={(e) => setForm({ ...form, total_slots: e.target.value })}
                className="rounded-lg border border-asphalt/15 px-4 py-2.5 text-sm" />
              <input required type="number" step="any" placeholder="Price / hour (₹)" value={form.price_per_hour}
                onChange={(e) => setForm({ ...form, price_per_hour: e.target.value })}
                className="rounded-lg border border-asphalt/15 px-4 py-2.5 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" checked={form.has_ev_charging}
                onChange={(e) => setForm({ ...form, has_ev_charging: e.target.checked })} />
              This location has EV charging
            </label>
            <Button type="submit" variant="primary" className="w-full" disabled={creating}>
              {creating ? 'Submitting…' : 'Submit for verification'}
            </Button>
            <p className="text-xs text-ink/45">New listings go live once an admin verifies ownership.</p>
          </form>
        </section>

        {/* QR scanner */}
        <section className="rounded-2xl border border-asphalt/10 bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Gate check-in / check-out</h2>
          <p className="mt-1 text-sm text-ink/60">Paste the scanned QR token (from a camera scanner in production).</p>
          <input
            placeholder="QR token" value={qrToken}
            onChange={(e) => setQrToken(e.target.value)}
            className="mt-4 w-full rounded-lg border border-asphalt/15 px-4 py-2.5 font-mono text-sm"
          />
          <div className="mt-3 flex gap-3">
            <Button variant="primary" onClick={scanCheckin} disabled={!qrToken}>Scan: Check in</Button>
            <Button variant="dark" onClick={scanCheckout} disabled={!qrToken}>Scan: Check out</Button>
          </div>
          {scanError && <p className="mt-3 text-sm text-cone">{scanError}</p>}
          {scanResult && (
            <div className="mt-4 rounded-lg bg-signal/10 p-4 font-mono text-xs text-signal-dark">
              {scanResult.type === 'checkin'
                ? `Checked in at ${new Date(scanResult.data.booking.checkin_time).toLocaleTimeString()}`
                : `Checked out — total ₹${scanResult.data.booking.total_amount} (overtime ₹${scanResult.data.booking.overtime_amount}), host payout ₹${scanResult.data.hostPayout}`}
            </div>
          )}
        </section>
      </div>

      {/* My listings */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">My listings</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <div key={l.location_id} className="rounded-xl border border-asphalt/10 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-ink">{l.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${l.is_verified ? 'bg-signal/10 text-signal-dark' : 'bg-meter/20 text-meter'}`}>
                  {l.is_verified ? 'Live' : 'Pending review'}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink/60">{l.address}</p>
              <p className="mt-2 font-mono text-sm text-ink/80">₹{l.price_per_hour}/hr · {l.total_slots} slots</p>
            </div>
          ))}
          {listings.length === 0 && <p className="text-sm text-ink/50">No listings yet — create one above.</p>}
        </div>
      </section>
    </div>
  );
}
