import { useEffect, useRef, useState } from 'react';
import Button from './Button.jsx';
import QrPass from './QrPass.jsx';
import api from '../lib/api.js';
import { useToast } from './Toast.jsx';

/**
 * BookingModal — full booking flow dialog.
 *
 * Props:
 *   location  – the location/listing object ({ location_id, name, address, price_per_hour, ... })
 *   slots     – array of slot objects for this location
 *   onClose   – called when modal should close
 */
export default function BookingModal({ location, slots = [], onClose }) {
  const toast = useToast();
  const dialogRef = useRef(null);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({
    vehicle_number: '',
    start_time: '',
    end_time: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { booking, qr_pass }

  // Trap focus & handle Escape
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    el.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Compute fare preview
  const farePreview = (() => {
    if (!form.start_time || !form.end_time || !location?.price_per_hour) return null;
    const hrs = (new Date(form.end_time) - new Date(form.start_time)) / 3_600_000;
    if (hrs <= 0) return null;
    return (hrs * Number(location.price_per_hour)).toFixed(2);
  })();

  const availableSlots = slots.filter((s) => s.status === 'available');

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) { toast.error('Please select a parking slot.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/bookings', {
        slot_id: selectedSlot.slot_id,
        vehicle_number: form.vehicle_number.trim().toUpperCase(),
        start_time: form.start_time,
        end_time: form.end_time,
      });
      setResult(data);
      toast.success('Booking confirmed! Show the QR to the host at the gate.', { duration: 6000 });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Now: set default start to now + 5 min rounded
  const nowRounded = (() => {
    const d = new Date(Date.now() + 5 * 60000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  })();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-asphalt/60 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Book a slot at ${location?.name}`}
        tabIndex={-1}
        className="fixed inset-x-4 bottom-0 top-12 z-50 mx-auto flex max-w-xl flex-col rounded-t-3xl bg-white shadow-lift outline-none sm:inset-4 sm:top-[10vh] sm:rounded-3xl sm:bottom-auto animate-scale-in overflow-hidden"
      >
        {/* Modal header */}
        <div className="flex items-start justify-between border-b border-asphalt/10 px-6 py-5">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">{location?.name}</h2>
            <p className="mt-0.5 text-sm text-ink/55">{location?.address}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close booking modal"
            className="ml-4 shrink-0 rounded-lg p-1.5 text-ink/40 hover:bg-asphalt/8 hover:text-ink transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {result ? (
            <QrPass booking={result.booking} qrDataUrl={result.qr_pass} onClose={onClose} />
          ) : (
            <form id="booking-form" onSubmit={submit} className="space-y-5">
              {/* Price info */}
              <div className="flex items-center justify-between rounded-xl bg-signal/8 px-4 py-3">
                <span className="text-sm text-signal-dark font-medium">Rate</span>
                <span className="font-mono font-bold text-signal-dark">₹{location?.price_per_hour}/hr</span>
              </div>

              {/* Slot selector */}
              <div>
                <label className="input-label">Choose a slot</label>
                {availableSlots.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-cone/40 bg-cone/5 p-4 text-center text-sm text-cone">
                    No slots currently available at this location.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {availableSlots.map((s) => (
                      <button
                        key={s.slot_id}
                        type="button"
                        onClick={() => setSelectedSlot(s)}
                        className={[
                          'rounded-lg border px-3 py-2 font-mono text-xs font-semibold transition-all',
                          selectedSlot?.slot_id === s.slot_id
                            ? 'border-signal bg-signal text-white scale-105'
                            : 'border-asphalt/15 text-ink/70 hover:border-signal/50 hover:bg-signal/5',
                        ].join(' ')}
                        aria-pressed={selectedSlot?.slot_id === s.slot_id}
                      >
                        {s.slot_number}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicle number */}
              <div>
                <label className="input-label" htmlFor="bm-vehicle">Vehicle number</label>
                <input
                  id="bm-vehicle"
                  className="input uppercase"
                  placeholder="e.g. DL 01 AB 1234"
                  value={form.vehicle_number}
                  onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                  required
                />
              </div>

              {/* Date/time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label" htmlFor="bm-start">Check-in</label>
                  <input
                    id="bm-start"
                    type="datetime-local"
                    className="input"
                    min={nowRounded}
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="input-label" htmlFor="bm-end">Check-out</label>
                  <input
                    id="bm-end"
                    type="datetime-local"
                    className="input"
                    min={form.start_time || nowRounded}
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Fare preview */}
              {farePreview && (
                <div className="rounded-xl border border-asphalt/10 bg-asphalt/4 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink/60">Estimated fare</span>
                    <span className="font-mono text-lg font-bold text-ink">₹{farePreview}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink/40">
                    Held in escrow · final bill computed from actual check-in/out time
                  </p>
                </div>
              )}

              {/* EV info */}
              {location?.has_ev_charging && (
                <div className="flex items-center gap-2 rounded-xl bg-signal/8 px-4 py-3 text-sm text-signal-dark">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0" aria-hidden="true">
                    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.718a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .945-.143Z" clipRule="evenodd" />
                  </svg>
                  <span>EV charging available at this location</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="border-t border-asphalt/10 px-6 py-4">
            <Button
              type="submit"
              form="booking-form"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={availableSlots.length === 0}
              className="w-full"
            >
              {loading ? 'Confirming…' : `Confirm & pay ${farePreview ? `₹${farePreview}` : ''}`}
            </Button>
            <p className="mt-2 text-center text-xs text-ink/40">
              Your payment is held securely until you check out
            </p>
          </div>
        )}
      </div>
    </>
  );
}
