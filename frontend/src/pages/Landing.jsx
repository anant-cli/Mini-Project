import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button.jsx';
import SlotStatusGrid from '../components/SlotStatusGrid.jsx';

/* ── Ticker stats ──────────────────────────────────────────────── */
const TICKER_ITEMS = [
  '14,000+ bookings completed',
  '3,200+ active hosts',
  '98 cities',
  'EV charging at 400+ locations',
  'Average 4.8★ host rating',
  'Real-time slot updates',
  'Escrow payment — zero disputes',
  '₹4.2 Cr paid out to hosts',
];

/* ── Driver journey steps ─────────────────────────────────────── */
const JOURNEY = [
  {
    plate: 'SEARCH',
    title: 'Find a slot nearby',
    body: 'Filter by price, vehicle type, and EV charging on a live map — pins turn red the instant a spot is taken.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
    ),
  },
  {
    plate: 'BOOK',
    title: 'Pay into escrow',
    body: 'Your fare is held by ParkShare — not the host — the instant you confirm a time window. No fraud possible.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    plate: 'ARRIVE',
    title: 'Scan in at the gate',
    body: "The host scans your QR pass. That's the only thing that starts your billing clock — not the booking time.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 18.75h.75v.75h-.75v-.75ZM18.75 13.5h.75v.75h-.75v-.75ZM18.75 18.75h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
      </svg>
    ),
  },
  {
    plate: 'LEAVE',
    title: 'Scan out, get billed',
    body: 'Checkout is scanned, the real duration is billed (overtime per-minute if needed), and the host is paid out automatically.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

/* ── Trust points ─────────────────────────────────────────────── */
const TRUST_POINTS = [
  { label: 'Two-device proof', body: "A booking can't be faked by one side — check-in requires both your phone and the host's scanner, in person." },
  { label: 'Escrow, not a handshake', body: 'Funds sit with the platform until checkout is confirmed, so neither side can walk away early.' },
  { label: 'Overtime, handled automatically', body: 'Stay past your window and it\'s billed per minute at checkout — no chasing, no awkward conversation.' },
  { label: 'Reputation both ways', body: 'Hosts rate drivers, drivers rate spaces. Repeat problems become visible before the next booking.' },
];

/* ── EV connectors ────────────────────────────────────────────── */
const EV_CONNECTORS = [
  { label: 'Type-2 · 7 kW', color: '#5FCBBE' },
  { label: 'CCS · 50 kW',   color: '#0E9A8C' },
  { label: 'CHAdeMO · 40 kW', color: '#0A6F65' },
  { label: 'AC/DC',          color: '#5FCBBE' },
];

/* ── Scroll-reveal hook ───────────────────────────────────────── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ── Earnings calculator ──────────────────────────────────────── */
function EarningsCalc() {
  const [slots, setSlots] = useState(2);
  const [hours, setHours] = useState(8);
  const [rate, setRate] = useState(50);
  const days = 22; // avg working days/month
  const gross = slots * hours * rate * days;
  const net = Math.round(gross * 0.85); // after 15% platform commission

  return (
    <div className="rounded-2xl border border-asphalt/10 bg-white p-6 shadow-sm">
      <p className="eyebrow-dark mb-4">Earnings calculator</p>
      <div className="space-y-4">
        {[
          { label: 'Number of slots', value: slots, setter: setSlots, min: 1, max: 20 },
          { label: 'Hours per day', value: hours, setter: setHours, min: 1, max: 24 },
          { label: 'Rate (₹/hr)', value: rate, setter: setRate, min: 10, max: 300, step: 10 },
        ].map(({ label, value, setter, min, max, step = 1 }) => (
          <div key={label}>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-ink/60">{label}</span>
              <span className="font-mono font-semibold text-ink">{value}{label.includes('₹') ? '' : ''}</span>
            </div>
            <input
              type="range" min={min} max={max} step={step} value={value}
              onChange={(e) => setter(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-asphalt/15 accent-signal"
            />
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl bg-signal/10 p-4 text-center">
        <p className="text-xs text-signal-dark">Est. monthly earnings (after 15% platform fee)</p>
        <p className="mt-1 font-display text-3xl font-bold text-signal-dark">
          ₹{net.toLocaleString('en-IN')}
        </p>
        <p className="mt-0.5 text-[11px] text-signal-dark/60">Based on {days} days/month at {hours}h/day</p>
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export default function Landing() {
  const [journeyRef, journeyVisible] = useReveal();
  const [trustRef, trustVisible]     = useReveal();
  const [evRef, evVisible]           = useReveal();
  const [hostRef, hostVisible]       = useReveal();

  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS]; // for seamless loop

  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-asphalt text-chalk">
        {/* Subtle lane-line pattern overlay */}
        <div className="pointer-events-none absolute inset-0 bg-lane-lines opacity-15" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
          {/* Left: copy */}
          <div className="animate-fade-up">
            <p className="eyebrow mb-5">Peer-to-peer parking marketplace</p>
            <h1 className="font-display text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
              Every empty driveway is a parking spot someone is{' '}
              <span className="text-signal">circling the block</span> for.
            </h1>
            <p className="mt-6 max-w-md text-base text-chalk/65 leading-relaxed">
              ParkShare turns unused space — driveways, mall lots, office bays — into bookable,
              QR-verified parking, with escrow payments and EV charging built in.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button as={Link} to="/search" variant="primary" size="lg">
                Find parking near you
              </Button>
              <Button
                as={Link} to="/host" size="lg"
                className="border border-chalk/25 bg-transparent text-chalk hover:border-signal hover:text-signal-light"
              >
                List your space
              </Button>
            </div>

            {/* Mini trust badges */}
            <div className="mt-8 flex flex-wrap gap-3">
              {['QR verified', 'Escrow payment', 'Live map'].map((b) => (
                <span key={b} className="badge badge-gray border border-chalk/15 bg-chalk/10 text-chalk/70">
                  ✓ {b}
                </span>
              ))}
            </div>
          </div>

          {/* Right: live slot grid widget */}
          <div className="animate-fade-up animate-fade-up-delay-2">
            <div className="rounded-2xl bg-asphalt-800 p-6 shadow-lift ring-1 ring-chalk/10">
              <div className="mb-4 flex items-center justify-between font-mono text-xs text-chalk/50">
                <span>LOT 04 — CONNAUGHT PLACE</span>
                <span className="flex items-center gap-1.5">
                  <span className="slot-pulse h-1.5 w-1.5 rounded-full bg-signal" style={{ color: '#0E9A8C' }} />
                  LIVE
                </span>
              </div>
              <SlotStatusGrid rows={4} cols={8} />
              <div className="mt-4 flex gap-5 font-mono text-[11px] text-chalk/55">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-signal" /> Available</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-meter" /> Reserved</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-cone" /> Occupied</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lane-line divider */}
        <div className="h-3 bg-lane-lines opacity-35" aria-hidden="true" />
      </section>

      {/* ═══ STATS TICKER ═══ */}
      <section className="overflow-hidden border-b border-asphalt/8 bg-white py-3" aria-label="Platform statistics">
        <div className="flex animate-marquee whitespace-nowrap">
          {doubled.map((item, i) => (
            <span key={i} className="mx-8 font-mono text-xs font-medium text-ink/55">
              <span className="mr-3 text-signal">▸</span>
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ═══ DRIVER JOURNEY ═══ */}
      <section ref={journeyRef} className="mx-auto max-w-7xl px-6 py-20">
        <div className={`${journeyVisible ? 'animate-fade-up' : 'opacity-0'}`}>
          <p className="eyebrow-dark">How it works</p>
          <h2 className="mt-3 font-display text-2xl font-bold text-ink sm:text-3xl">
            From search to checkout, in four scans
          </h2>
          <p className="mt-3 max-w-2xl text-ink/55 leading-relaxed">
            The booking flow is built around one rule: money and access only move when both sides show up.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {JOURNEY.map((step, i) => (
            <div
              key={step.plate}
              className={`relative rounded-2xl border border-asphalt/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-lift ${
                journeyVisible ? `animate-fade-up animate-fade-up-delay-${i + 1}` : 'opacity-0'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-block rounded border-2 border-ink/75 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-ink/75">
                  {step.plate}
                </span>
                <span className="text-signal">{step.icon}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">{step.body}</p>
              {/* Connector arrow */}
              {i < JOURNEY.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 md:block" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C8CDD5" strokeWidth="1.5" className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TRUST MECHANIC ═══ */}
      <section ref={trustRef} className="bg-asphalt py-20 text-chalk">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            {/* Left: copy */}
            <div className={trustVisible ? 'animate-fade-up' : 'opacity-0'}>
              <p className="eyebrow mb-4">The hard problem</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">
                Neither side can fake a QR scan alone
              </h2>
              <p className="mt-4 text-chalk/60 leading-relaxed">
                That's the whole trust model: check-in and check-out both require the driver's phone
                and the host's scanner in the same place, at the same time. Everything else —
                escrow, overtime billing, ratings — is built on top of that one guarantee.
              </p>

              {/* QR illustration */}
              <div className="mt-8 flex items-center gap-4 rounded-xl border border-chalk/15 bg-asphalt-700 p-4">
                <div className="rounded-lg bg-white p-2">
                  <svg viewBox="0 0 80 80" className="h-16 w-16" aria-hidden="true">
                    {/* Simplified QR-like SVG */}
                    <rect x="5" y="5" width="25" height="25" rx="3" fill="#14181F" />
                    <rect x="50" y="5" width="25" height="25" rx="3" fill="#14181F" />
                    <rect x="5" y="50" width="25" height="25" rx="3" fill="#14181F" />
                    <rect x="10" y="10" width="15" height="15" rx="1" fill="white" />
                    <rect x="55" y="10" width="15" height="15" rx="1" fill="white" />
                    <rect x="10" y="55" width="15" height="15" rx="1" fill="white" />
                    <rect x="14" y="14" width="7" height="7" fill="#14181F" />
                    <rect x="59" y="14" width="7" height="7" fill="#14181F" />
                    <rect x="14" y="59" width="7" height="7" fill="#14181F" />
                    {/* Data dots */}
                    {[
                      [35,5],[40,5],[45,5],[35,10],[45,10],[35,15],[40,15],[45,15],
                      [35,25],[40,25],[35,30],[45,30],[35,35],[40,35],[45,35],
                      [50,35],[55,35],[60,35],[65,35],[70,35],
                      [50,40],[60,40],[70,40],[50,45],[55,45],[65,45],[70,45],
                      [50,50],[60,50],[50,55],[55,55],[60,55],[65,55],
                      [35,50],[35,55],[35,60],[35,65],[35,70],
                      [40,50],[45,50],[40,55],[40,60],[45,60],[40,65],[45,65],[40,70],[45,70],
                    ].map(([x, y], idx) => (
                      <rect key={idx} x={x} y={y} width="5" height="5" fill="#14181F" />
                    ))}
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-display font-semibold text-chalk">QR Pass</p>
                  <p className="mt-1 text-chalk/55 text-xs">
                    Unique per booking · requires both devices · can't be replayed
                  </p>
                </div>
              </div>
            </div>

            {/* Right: trust points grid */}
            <div className={`grid gap-4 sm:grid-cols-2 ${trustVisible ? 'animate-fade-up animate-fade-up-delay-2' : 'opacity-0'}`}>
              {TRUST_POINTS.map((t) => (
                <div key={t.label} className="rounded-xl border border-chalk/10 bg-asphalt-700 p-5">
                  <h3 className="font-display text-sm font-semibold text-signal-light">{t.label}</h3>
                  <p className="mt-2 text-sm text-chalk/55 leading-relaxed">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ EV CALLOUT ═══ */}
      <section ref={evRef} className="mx-auto max-w-7xl px-6 py-20">
        <div className={`rounded-2xl bg-signal/8 p-8 md:p-12 ${evVisible ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow-dark">Charging, not just parking</p>
              <h2 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
                Filter for EV chargers by connector, power, and price per kWh
              </h2>
              <p className="mt-3 max-w-xl text-ink/55 leading-relaxed">
                Type-1, Type-2, CCS, or CHAdeMO — hosts list exactly what's on offer, and the
                charging fee is billed alongside the parking fee in a single transaction.
              </p>
            </div>
            {/* Connector pills */}
            <div className="flex flex-wrap gap-2 md:flex-col">
              {EV_CONNECTORS.map((c) => (
                <span
                  key={c.label}
                  className="flex items-center gap-2 rounded-full border border-signal/30 bg-white px-4 py-2 font-mono text-xs text-signal-dark shadow-sm"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.718a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .945-.143Z" clipRule="evenodd" />
                  </svg>
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOST CTA / EARNINGS CALC ═══ */}
      <section ref={hostRef} className="border-t border-asphalt/8 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className={`grid items-start gap-12 md:grid-cols-2 ${hostVisible ? 'animate-fade-up' : 'opacity-0'}`}>
            <div>
              <p className="eyebrow-dark">For space owners</p>
              <h2 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
                Have space you're not using?
              </h2>
              <p className="mt-3 max-w-lg text-ink/55 leading-relaxed">
                List a driveway, a mall bay, or a hospital lot in minutes. You approve the price,
                the platform handles verification, escrow, and payout.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Submit for admin verification — goes live once approved',
                  'Set your own rate, hours, and vehicle types',
                  'EV charger info listed separately with per-kWh pricing',
                  'Host rates drivers — repeat bad actors stay visible',
                  'Payouts released automatically after every checkout',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-ink/65">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                    {point}
                  </li>
                ))}
              </ul>
              <Button as={Link} to="/host" variant="dark" size="lg" className="mt-8">
                List your space →
              </Button>
            </div>
            <EarningsCalc />
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-asphalt py-12 text-chalk">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 font-display text-lg font-bold">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal text-sm font-bold">P</span>
                ParkShare
              </div>
              <p className="mt-3 text-sm text-chalk/50 leading-relaxed">
                A peer-to-peer parking marketplace — college mini project demonstrating geolocation,
                real-time WebSockets, escrow payments, and QR-based trust verification.
              </p>
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-chalk/80 mb-3">Platform</p>
              <ul className="space-y-2 text-sm text-chalk/50">
                <li><Link to="/search" className="hover:text-signal transition-colors">Find parking</Link></li>
                <li><Link to="/host" className="hover:text-signal transition-colors">List a space</Link></li>
                <li><Link to="/signup" className="hover:text-signal transition-colors">Create account</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-chalk/80 mb-3">Tech stack</p>
              <div className="flex flex-wrap gap-2">
                {['React', 'Node.js', 'PostgreSQL', 'Socket.io', 'Leaflet', 'JWT', 'Tailwind'].map((t) => (
                  <span key={t} className="rounded-md border border-chalk/15 px-2 py-0.5 font-mono text-[11px] text-chalk/50">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-chalk/10 pt-6 text-center font-mono text-xs text-chalk/30">
            ParkShare — built as a college mini project · MIT License
          </div>
        </div>
      </footer>
    </div>
  );
}
