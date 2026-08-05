import { Link } from 'react-router-dom';
import Button from '../components/Button.jsx';
import SlotStatusGrid from '../components/SlotStatusGrid.jsx';

const stats = [
  ['14k+', 'verified bookings'],
  ['98', 'active cities'],
  ['4.8', 'average rating'],
];

const steps = [
  ['01', 'Find', 'Search live nearby spaces with price, EV support, vehicle fit, and availability.'],
  ['02', 'Reserve', 'Book a time window and keep the payment safely held until checkout.'],
  ['03', 'Scan', 'Use the QR pass at arrival and exit so both sides confirm the actual stay.'],
];

const features = [
  ['Live slots', 'Real-time status prevents double booking and wasted arrival trips.'],
  ['Escrow payments', 'Drivers pay with confidence, hosts receive automatic payouts after checkout.'],
  ['EV ready', 'Filter by connector, charging speed, and parking plus energy pricing.'],
  ['Trust layer', 'Ratings, QR proof, and admin approvals keep the marketplace reliable.'],
];

function ParkingIllustration() {
  return (
    <div className="clay relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-[2rem] p-5">
      <div className="absolute left-8 top-8 h-16 w-16 rounded-3xl bg-meter/85 clay-pop" />
      <div className="absolute bottom-8 right-8 h-20 w-20 rounded-[1.6rem] bg-cone/80 clay-pop" />
      <div className="clay-pressed relative h-full rounded-[1.5rem] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/45">Lot 04</p>
            <h2 className="font-display text-xl font-bold text-ink">Connaught Place</h2>
          </div>
          <span className="rounded-full bg-signal px-3 py-1 font-mono text-[11px] font-bold text-white clay-pop">
            Live
          </span>
        </div>
        <SlotStatusGrid rows={4} cols={8} />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {stats.map(([value, label]) => (
            <div key={label} className="clay rounded-2xl p-3 text-center">
              <p className="font-display text-2xl font-bold text-ink">{value}</p>
              <p className="mt-1 text-[11px] leading-tight text-ink/50">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="overflow-hidden">
      <section className="relative px-6 pb-16 pt-14 md:pb-24 md:pt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <span className="clay inline-flex rounded-full px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-signal-dark">
              Smart parking marketplace
            </span>
            <h1 className="mt-7 max-w-3xl font-display text-4xl font-bold leading-[1.08] text-ink sm:text-5xl lg:text-6xl">
              Park faster with a soft, trusted way to book real spaces.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-ink/62">
              ParkSlot connects drivers with verified private and commercial parking,
              using live slot status, QR check-in, escrow payments, and EV charger data.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button as={Link} to="/search" size="lg">
                Find parking
              </Button>
              <Button as={Link} to="/signup" variant="outline" size="lg">
                Create account
              </Button>
            </div>
          </div>
          <ParkingIllustration />
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {steps.map(([number, title, body]) => (
            <article key={title} className="card">
              <span className="clay-pop inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-signal font-display font-bold text-white">
                {number}
              </span>
              <h2 className="mt-5 font-display text-xl font-bold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-ink/58">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow-dark">Built for confidence</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink">
              A balanced palette with tactile, useful surfaces.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map(([title, body], index) => (
              <article key={title} className="card">
                <div
                  className={`mb-5 h-12 w-12 rounded-2xl clay-pop ${
                    index === 0 ? 'bg-signal' : index === 1 ? 'bg-meter' : index === 2 ? 'bg-indigo-500' : 'bg-cone'
                  }`}
                />
                <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-ink/58">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="clay mx-auto grid max-w-7xl items-center gap-8 rounded-[2rem] p-8 md:grid-cols-[1fr_auto] md:p-10">
          <div>
            <p className="eyebrow-dark">For hosts</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink">
              Turn idle space into monthly income.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/60">
              Add locations, set rates, submit for approval, and let ParkSlot handle
              availability, verification, payments, and booking history.
            </p>
          </div>
          <Button as={Link} to="/host" variant="dark" size="lg">
            List your space
          </Button>
        </div>
      </section>
    </div>
  );
}
