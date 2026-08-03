import { useEffect, useRef, useState } from 'react';
import api from '../lib/api.js';
import Button from '../components/Button.jsx';
import { useToast } from '../components/Toast.jsx';

/* ── Count-up animation hook ── */
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !target) return;
    started.current = true;
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setVal(Math.round(progress * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return val;
}

/* ── Stat card with count-up ── */
function StatCard({ label, value, prefix = '', suffix = '', color = 'text-ink' }) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const animated = useCountUp(numericValue);
  return (
    <div className="card">
      <p className="font-mono text-xs uppercase tracking-wide text-ink/45">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${color}`}>
        {prefix}{typeof value === 'number' ? animated.toLocaleString('en-IN') : value}{suffix}
      </p>
    </div>
  );
}

/* ── Timeline bar for disputes ── */
function TimelineBar({ checkinTime, checkoutTime, startTime, endTime }) {
  const fmt = (dt) => dt ? new Date(dt).toLocaleTimeString('en-IN', { timeStyle: 'short' }) : '—';
  return (
    <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-ink/60">
      <span className="rounded bg-signal/15 px-1.5 py-0.5 text-signal-dark">Booked {fmt(startTime)}</span>
      <div className="flex-1 h-0.5 bg-asphalt/10 rounded" />
      {checkinTime && <span className="rounded bg-meter/15 px-1.5 py-0.5 text-meter">In {fmt(checkinTime)}</span>}
      <div className="flex-1 h-0.5 bg-asphalt/10 rounded" />
      {checkoutTime
        ? <span className="rounded bg-cone/15 px-1.5 py-0.5 text-cone">Out {fmt(checkoutTime)}</span>
        : <span className="rounded bg-cone/15 px-1.5 py-0.5 text-cone">No checkout</span>
      }
      <div className="flex-1 h-0.5 bg-asphalt/10 rounded" />
      <span className="rounded bg-asphalt/10 px-1.5 py-0.5">Due {fmt(endTime)}</span>
    </div>
  );
}

export default function AdminPanel() {
  const toast = useToast();
  const [pending, setPending] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [report, setReport] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setError('');
    try {
      const [p, d, r, u] = await Promise.all([
        api.get('/listings/admin/pending'),
        api.get('/admin/disputes'),
        api.get('/admin/report'),
        api.get('/admin/users').catch(() => ({ data: { users: [] } })),
      ]);
      setPending(p.data.listings || []);
      setDisputes(d.data.disputes || []);
      setReport(r.data);
      setUsers(u.data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load admin data — are you logged in as admin?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const review = async (id, approve) => {
    try {
      await api.patch(`/listings/admin/${id}/review`, { approve });
      toast.success(approve ? 'Listing approved and live.' : 'Listing rejected.');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  const resolve = async (id) => {
    const resolution = window.prompt('Resolution notes for this dispute:');
    if (resolution === null) return;
    try {
      await api.patch(`/admin/disputes/${id}/resolve`, { resolution });
      toast.success('Dispute resolved.');
      loadAll();
    } catch {
      toast.error('Could not resolve dispute.');
    }
  };

  const suspend = async (id, name) => {
    if (!window.confirm(`Suspend ${name}? This will flag them as unverified.`)) return;
    try {
      await api.patch(`/admin/users/${id}/suspend`);
      toast.success(`${name} suspended.`);
      loadAll();
    } catch {
      toast.error('Could not suspend user.');
    }
  };

  const TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'listings',  label: `Listings (${pending.length})` },
    { id: 'disputes',  label: `Disputes (${disputes.length})` },
    { id: 'users',     label: 'Users' },
  ];

  const ROLE_COLORS = {
    driver: 'badge-green', host: 'badge-amber',
    business_host: 'badge-amber', admin: 'badge-red',
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Admin panel</h1>
          <p className="mt-1 text-sm text-ink/55">Verify listings, resolve disputes, monitor the platform.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll}>Refresh</Button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-cone/30 bg-cone/8 p-4 text-sm text-cone">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-asphalt/10 bg-asphalt/4 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={[
              'whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeTab === t.id ? 'bg-white text-ink shadow-sm' : 'text-ink/55 hover:text-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-4">
              {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
            </div>
          ) : report ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Gross volume" value={Number(report.revenue.gross_volume)} prefix="₹" color="text-signal-dark" />
                <StatCard label="Transactions" value={Number(report.revenue.total_transactions)} color="text-ink" />
                <StatCard label="Pending listings" value={pending.length} color="text-meter" />
                <StatCard label="Open disputes" value={disputes.length} color="text-cone" />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Bookings by status */}
                <div className="card">
                  <h2 className="font-display text-sm font-semibold text-ink mb-4">Bookings by status</h2>
                  <div className="space-y-2">
                    {report.bookingCounts.map((b) => (
                      <div key={b.status} className="flex items-center gap-3">
                        <span className="w-24 text-xs text-ink/55 capitalize">{b.status}</span>
                        <div className="flex-1 h-2 rounded-full bg-asphalt/8 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-signal transition-all"
                            style={{ width: `${Math.min(100, (Number(b.count) / Math.max(...report.bookingCounts.map(x => Number(x.count)))) * 100)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-mono text-xs font-semibold text-ink">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users by role */}
                <div className="card">
                  <h2 className="font-display text-sm font-semibold text-ink mb-4">Users by role</h2>
                  <div className="space-y-2">
                    {report.userCounts.map((u) => (
                      <div key={u.role} className="flex items-center justify-between">
                        <span className={`badge ${ROLE_COLORS[u.role] ?? 'badge-gray'}`}>{u.role}</span>
                        <span className="font-mono text-sm font-bold text-ink">{u.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ─── LISTINGS ─── */}
      {activeTab === 'listings' && (
        <section className="mt-6 space-y-3">
          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-asphalt/20 p-10 text-center text-sm text-ink/45">
              No listings awaiting verification.
            </div>
          ) : (
            pending.map((l) => (
              <div key={l.location_id} className="card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-ink">{l.name}</h3>
                    <p className="mt-0.5 text-sm text-ink/55">{l.address}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="badge badge-gray">₹{l.price_per_hour}/hr</span>
                      <span className="badge badge-gray">{l.total_slots} slots</span>
                      {l.has_ev_charging && <span className="badge badge-green">⚡ EV</span>}
                      <a
                        href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="badge badge-gray hover:bg-signal/15 hover:text-signal-dark transition-colors"
                      >
                        📍 View on map
                      </a>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="primary" size="sm" onClick={() => review(l.location_id, true)}>
                      Approve
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => review(l.location_id, false)}>
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* ─── DISPUTES ─── */}
      {activeTab === 'disputes' && (
        <section className="mt-6 space-y-4">
          {disputes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-asphalt/20 p-10 text-center text-sm text-ink/45">
              No open disputes.
            </div>
          ) : (
            disputes.map((d) => (
              <div key={d.dispute_id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink leading-relaxed">{d.reason}</p>
                    <p className="mt-1 font-mono text-xs text-ink/50">
                      Vehicle {d.vehicle_number} · ₹{d.total_amount ?? '—'}
                    </p>
                    <TimelineBar
                      checkinTime={d.checkin_time}
                      checkoutTime={d.checkout_time}
                      startTime={d.start_time}
                      endTime={d.end_time}
                    />
                  </div>
                  <Button variant="dark" size="sm" onClick={() => resolve(d.dispute_id)}>
                    Resolve
                  </Button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* ─── USERS ─── */}
      {activeTab === 'users' && (
        <section className="mt-6">
          {users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-asphalt/20 p-10 text-center text-sm text-ink/45">
              No user data available (requires /api/admin/users endpoint).
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-asphalt/10">
              <table className="w-full text-sm">
                <thead className="border-b border-asphalt/8 bg-asphalt/4">
                  <tr>
                    {['Name', 'Email', 'Role', 'Rating', 'Verified', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wide text-ink/45">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-asphalt/8 bg-white">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-asphalt/3 transition-colors">
                      <td className="px-4 py-3 font-display font-semibold text-ink">{u.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink/60">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${ROLE_COLORS[u.role] ?? 'badge-gray'}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{u.avg_rating ?? '—'}★</td>
                      <td className="px-4 py-3">
                        {u.id_verified
                          ? <span className="badge badge-green">Verified</span>
                          : <span className="badge badge-red">Unverified</span>}
                      </td>
                      <td className="px-4 py-3">
                        {u.role !== 'admin' && (
                          <Button
                            variant="danger" size="sm"
                            onClick={() => suspend(u.user_id, u.name)}
                          >
                            Suspend
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
