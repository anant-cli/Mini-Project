import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import Button from '../components/Button.jsx';

export default function AdminPanel() {
  const [pending, setPending] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const loadAll = async () => {
    setError('');
    try {
      const [p, d, r] = await Promise.all([
        api.get('/listings/admin/pending'),
        api.get('/admin/disputes'),
        api.get('/admin/report'),
      ]);
      setPending(p.data.listings);
      setDisputes(d.data.disputes);
      setReport(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load admin data — are you logged in as an admin?');
    }
  };

  useEffect(() => { loadAll(); }, []);

  const review = async (id, approve) => {
    await api.patch(`/listings/admin/${id}/review`, { approve });
    loadAll();
  };

  const resolve = async (id) => {
    const resolution = prompt('Resolution notes for this dispute:');
    if (resolution === null) return;
    await api.patch(`/admin/disputes/${id}/resolve`, { resolution });
    loadAll();
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Admin panel</h1>
      <p className="mt-1 text-sm text-ink/60">Verify listings, resolve disputes, monitor the platform.</p>
      {error && <p className="mt-4 text-sm text-cone">{error}</p>}

      {/* Platform report */}
      {report && (
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-asphalt/10 bg-white p-5">
            <p className="font-mono text-xs uppercase tracking-wide text-ink/50">Gross volume</p>
            <p className="mt-1 font-display text-2xl font-bold text-signal-dark">₹{report.revenue.gross_volume}</p>
          </div>
          <div className="rounded-xl border border-asphalt/10 bg-white p-5">
            <p className="font-mono text-xs uppercase tracking-wide text-ink/50">Transactions</p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">{report.revenue.total_transactions}</p>
          </div>
          <div className="rounded-xl border border-asphalt/10 bg-white p-5">
            <p className="font-mono text-xs uppercase tracking-wide text-ink/50">Bookings by status</p>
            <div className="mt-1 space-y-0.5 text-xs text-ink/70">
              {report.bookingCounts.map((b) => (
                <div key={b.status} className="flex justify-between"><span>{b.status}</span><span className="font-mono">{b.count}</span></div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pending listings */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink">Listings awaiting verification</h2>
        <div className="mt-4 space-y-3">
          {pending.map((l) => (
            <div key={l.location_id} className="flex items-center justify-between rounded-xl border border-asphalt/10 bg-white p-4">
              <div>
                <h3 className="font-display text-sm font-semibold text-ink">{l.name}</h3>
                <p className="text-xs text-ink/60">{l.address} · ₹{l.price_per_hour}/hr · {l.total_slots} slots</p>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => review(l.location_id, true)}>Approve</Button>
                <Button variant="outline" onClick={() => review(l.location_id, false)}>Reject</Button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="text-sm text-ink/50">Nothing pending review.</p>}
        </div>
      </section>

      {/* Disputes */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink">Open disputes</h2>
        <div className="mt-4 space-y-3">
          {disputes.map((d) => (
            <div key={d.dispute_id} className="rounded-xl border border-asphalt/10 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-ink/80">{d.reason}</p>
                  <p className="mt-1 font-mono text-xs text-ink/50">
                    Vehicle {d.vehicle_number} · check-in {d.checkin_time ? new Date(d.checkin_time).toLocaleString() : '—'} ·
                    check-out {d.checkout_time ? new Date(d.checkout_time).toLocaleString() : '—'} · total ₹{d.total_amount ?? '—'}
                  </p>
                </div>
                <Button variant="dark" onClick={() => resolve(d.dispute_id)}>Resolve</Button>
              </div>
            </div>
          ))}
          {disputes.length === 0 && <p className="text-sm text-ink/50">No open disputes.</p>}
        </div>
      </section>
    </div>
  );
}
