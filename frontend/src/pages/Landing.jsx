import { Link } from 'react-router-dom';
import Button from '../components/Button.jsx';
import SlotStatusGrid from '../components/SlotStatusGrid.jsx';

const journey = [
  { plate: 'SEARCH', title: 'Find a slot nearby', body: 'Filter by price, vehicle type, and EV charging on a live map — colors update the moment a spot is taken.' },
  { plate: 'BOOK', title: 'Pay into escrow', body: 'Your fare is held by ParkShare, not the host, the instant you confirm a time window.' },
  { plate: 'ARRIVE', title: 'Scan in at the gate', body: 'The host scans your QR pass. That\u2019s the only thing that starts your billing clock.' },
  { plate: 'LEAVE', title: 'Scan out, get billed', body: 'Checkout is scanned, the real duration is billed, and the host is paid out automatically.' },
];

const trustPoints = [
  { label: 'Two-device proof', body: 'A booking can\u2019t be faked by one side — check-in requires both your phone and the host\u2019s scanner, in person.' },
  { label: 'Escrow, not a handshake', body: 'Funds sit with the platform until checkout is confirmed, so neither side can walk away early.' },
  { label: 'Overtime, handled automatically', body: 'Stay past your window and it\u2019s billed per minute at checkout — no chasing, no awkward conversation.' },
  { label: 'Reputation both ways', body: 'Hosts rate drivers, drivers rate spaces. Repeat problems become visible before the next booking.' },
];

export default function Landing() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-asphalt text-chalk">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-signal-light">
              Peer-to-peer parking marketplace
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.08] sm:text-5xl">
              Every empty driveway is a parking spot someone is circling the block for.
            </h1>
            <p className="mt-6 max-w-md text-base text-chalk/70">
              ParkShare turns unused space — driveways, mall lots, office bays — into bookable,
              QR-verified parking, with escrow payments and EV charging built in.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button as={Link} to="/search" variant="primary">Find parking near you</Button>
              <Button as={Link} to="/host" variant="outline" className="border-chalk/30 text-chalk hover:border-signal hover:text-signal-light">
                List your space
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-asphalt-800 p-6 shadow-lift">
            <div className="mb-4 flex items-center justify-between font-mono text-xs text-chalk/50">
              <span>LOT 04 — CONNAUGHT PLACE</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-signal" /> LIVE</span>
            </div>
            <SlotStatusGrid rows={4} cols={8} />
            <div className="mt-4 flex gap-5 font-mono text-[11px] text-chalk/60">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-signal" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-meter" /> Reserved</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-cone" /> Occupied</span>
            </div>
          </div>
        </div>
        <div className="h-3 bg-lane-lines opacity-40" />
      </section>

      {/* DRIVER JOURNEY — a real sequence, so plate-style step tags earn their place */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">From search to checkout, in four scans</h2>
        <p className="mt-3 max-w-2xl text-ink/60">
          The booking flow is built around one rule: money and access only move when both sides show up.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {journey.map((step, i) => (
            <div key={step.plate} className="relative rounded-xl border border-asphalt/10 bg-white p-5">
              <span className="inline-block rounded border-2 border-ink/80 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-ink/80">
                {step.plate}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{step.body}</p>
              {i < journey.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-asphalt/15 md:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* TRUST MECHANIC */}
      <section className="bg-asphalt-800 py-20 text-chalk">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-signal-light">The hard problem</p>
              <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">
                Neither side can fake a QR scan alone
              </h2>
              <p className="mt-4 text-chalk/65">
                That's the whole trust model: check-in and check-out both require the driver's phone
                and the host's scanner in the same place, at the same time. Everything else —
                escrow, overtime billing, ratings — is built on top of that one guarantee.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {trustPoints.map((t) => (
                <div key={t.label} className="rounded-lg border border-chalk/10 p-5">
                  <h3 className="font-display text-sm font-semibold text-signal-light">{t.label}</h3>
                  <p className="mt-2 text-sm text-chalk/60">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EV CALLOUT */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-10 rounded-2xl bg-signal/10 p-10 md:grid-cols-[1fr_auto]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-signal-dark">Charging, not just parking</p>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
              Filter for EV chargers by connector, power, and price per kWh
            </h2>
            <p className="mt-3 max-w-xl text-ink/60">
              Type-1, Type-2, CCS, or CHAdeMO — hosts list exactly what's on offer, and the
              charging fee is billed alongside the parking fee, not as a separate transaction.
            </p>
          </div>
          <div className="flex gap-3 font-mono text-xs">
            {['Type-2 · 7kW', 'CCS · 50kW', 'CHAdeMO · 40kW'].map((c) => (
              <span key={c} className="rounded-full border border-signal/40 bg-white px-3 py-1.5 text-signal-dark">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* HOST CTA */}
      <section className="border-t border-asphalt/10 bg-white py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">Have space you're not using?</h2>
            <p className="mt-2 max-w-lg text-ink/60">
              List a driveway, a mall bay, or a hospital lot in minutes. You approve the price,
              the platform handles verification and payout.
            </p>
          </div>
          <Button as={Link} to="/host" variant="dark">List your space</Button>
        </div>
      </section>

      <footer className="bg-asphalt py-10 text-center font-mono text-xs text-chalk/40">
        ParkShare — a peer-to-peer parking marketplace, built as a college mini project.
      </footer>
    </div>
  );
}
