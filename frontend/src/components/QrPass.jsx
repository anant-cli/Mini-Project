import Button from './Button.jsx';

/**
 * QrPass — displays a booking's QR pass card.
 *
 * Props:
 *   booking    – booking object
 *   qrDataUrl  – base64 PNG data URL from the API
 *   onClose    – optional close callback
 */
export default function QrPass({ booking, qrDataUrl, onClose }) {
  if (!booking) return null;

  const fmt = (dt) => dt ? new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const download = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `parkshare-pass-${booking.booking_id?.slice(0, 8) ?? 'pass'}.png`;
    a.click();
  };

  return (
    <div className="animate-scale-in rounded-2xl border border-asphalt/10 bg-white p-6 shadow-lift">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow-dark">Booking confirmed</p>
          <h2 className="mt-1 font-display text-xl font-bold text-ink">Your QR Pass</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close QR pass"
            className="rounded-lg p-1.5 text-ink/40 hover:bg-asphalt/8 hover:text-ink/70 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        )}
      </div>

      {/* QR image */}
      {qrDataUrl && (
        <div className="mt-5 flex justify-center rounded-xl bg-asphalt/5 p-4">
          <img
            src={qrDataUrl}
            alt="Booking QR pass — show this to the host at the gate"
            className="h-44 w-44 rounded-lg"
          />
        </div>
      )}

      {/* Booking details */}
      <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
        {[
          { label: 'Vehicle', value: booking.vehicle_number },
          { label: 'Slot', value: booking.slot_number ?? '—' },
          { label: 'Check-in', value: fmt(booking.start_time) },
          { label: 'Check-out', value: fmt(booking.end_time) },
          { label: 'Est. fare', value: `₹${booking.estimated_amount ?? '—'}` },
          { label: 'Status', value: booking.status },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-asphalt/5 px-3 py-2">
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ink/45">{label}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-center font-mono text-[10px] text-ink/40">
        Show this QR to the host when you arrive · Booking {booking.booking_id?.slice(0, 8) ?? ''}
      </p>

      {qrDataUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={download}
          className="mt-4 w-full"
        >
          Download pass
        </Button>
      )}
    </div>
  );
}
