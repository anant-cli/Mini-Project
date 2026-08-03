import { useEffect, useRef, useState } from 'react';

const STATUS_COLORS = {
  available: { bg: '#0E9A8C', cls: 'slot-pulse' },
  booked:    { bg: '#F2A93B', cls: '' },
  occupied:  { bg: '#FF5F45', cls: 'occupied-glow' },
  disabled:  { bg: '#8898A8', cls: '' },
};

/**
 * Visual slot-status grid. Accepts an optional `slots` array from the API;
 * falls back to a randomised demo grid when none is provided.
 *
 * Props:
 *   rows     – number of rows (default 4)
 *   cols     – number of columns (default 8)
 *   slots    – optional array of { slot_id, status } from the API
 *   onSelect – optional callback(slot) when a user clicks a slot
 *   selected – slot_id of the currently selected slot
 */
export default function SlotStatusGrid({ rows = 4, cols = 8, slots, onSelect, selected }) {
  const [demo, setDemo] = useState([]);
  const timerRef = useRef(null);

  // Generate a random demo grid and occasionally flip a slot
  useEffect(() => {
    if (slots) return; // real data provided — no demo needed

    const gen = () =>
      Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.random();
        return {
          slot_id: `demo-${i}`,
          status: r < 0.55 ? 'available' : r < 0.80 ? 'booked' : 'occupied',
        };
      });

    setDemo(gen());

    // Occasionally flip a slot status to simulate live updates
    timerRef.current = setInterval(() => {
      setDemo((prev) => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * next.length);
        const statuses = ['available', 'available', 'available', 'booked', 'occupied'];
        next[idx] = { ...next[idx], status: statuses[Math.floor(Math.random() * statuses.length)] };
        return next;
      });
    }, 2000);

    return () => clearInterval(timerRef.current);
  }, [rows, cols, slots]);

  const data = slots ?? demo;

  return (
    <div
      role="grid"
      aria-label="Parking slot status grid"
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {data.map((slot) => {
        const { bg, cls } = STATUS_COLORS[slot.status] || STATUS_COLORS.available;
        const isSelected = selected === slot.slot_id;
        return (
          <button
            key={slot.slot_id}
            role="gridcell"
            title={`${slot.slot_number || slot.slot_id} — ${slot.status}`}
            disabled={slot.status !== 'available'}
            onClick={() => onSelect?.(slot)}
            className={[
              'h-5 w-full rounded-sm transition-all duration-300',
              cls,
              onSelect && slot.status === 'available' ? 'cursor-pointer hover:scale-110 hover:brightness-110' : 'cursor-default',
              isSelected ? 'ring-2 ring-white ring-offset-1 scale-110' : '',
            ].join(' ')}
            style={{ background: bg, color: bg }}
            aria-label={`Slot ${slot.slot_number || slot.slot_id}: ${slot.status}`}
            aria-pressed={isSelected}
          />
        );
      })}
    </div>
  );
}
