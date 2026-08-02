import { useEffect, useState } from 'react';

// The signature element of the ParkShare UI: a grid of slot indicators that
// behaves like the real sensor lights embedded in a parking bay — green
// (available), amber (about to expire / reserved soon), coral (occupied).
// One cell flips state on an interval to dramatize "real-time" without
// being a generic animated gradient.
const STATES = ['available', 'available', 'available', 'occupied', 'reserved'];

const colorFor = (state) => ({
  available: 'bg-signal text-signal',
  occupied: 'bg-cone text-cone',
  reserved: 'bg-meter text-meter',
}[state]);

export default function SlotStatusGrid({ rows = 4, cols = 8, className = '' }) {
  const [grid, setGrid] = useState(() =>
    Array.from({ length: rows * cols }, () => STATES[Math.floor(Math.random() * STATES.length)])
  );

  useEffect(() => {
    const id = setInterval(() => {
      setGrid((prev) => {
        const next = [...prev];
        const i = Math.floor(Math.random() * next.length);
        next[i] = STATES[Math.floor(Math.random() * STATES.length)];
        return next;
      });
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`grid gap-2 ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      role="img"
      aria-label="Live grid of parking slot availability indicators"
    >
      {grid.map((state, i) => (
        <div
          key={i}
          className={`slot-pulse aspect-square rounded-md ${colorFor(state)} bg-opacity-90`}
          style={{ animationDelay: `${(i % 7) * 0.2}s` }}
        />
      ))}
    </div>
  );
}
