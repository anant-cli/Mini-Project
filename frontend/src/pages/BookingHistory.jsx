import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import Button from '../components/Button.jsx';
import QrPass from '../components/QrPass.jsx';
import StarRating from '../components/StarRating.jsx';
import { useToast } from '../components/Toast.jsx';

const STATUS_COLORS = {
  confirmed: 'badge-green',
  checked_in: 'badge-amber',
  completed: 'badge-gray',
  cancelled: 'badge-red',
  disputed: 'badge-red',
};

export default function BookingHistory() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePass, setActivePass] = useState(null); // { booking, qr_pass }
  const [reviewForms, setReviewForms] = useState({});
  const [submittingReview, setSubmittingReview] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/bookings/mine');
        setBookings(data.bookings || []);
      } catch (err) {
        toast.error('Could not load your bookings.');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPass = async (booking) => {
    try {
      const { data } = await api.get(`/bookings/${booking.booking_id}/pass`);
      setActivePass({ booking, qr_pass: data.qr_pass });
    } catch {
      toast.error('Could not load QR pass for this booking.');
    }
  };

  const fmtDate = (dt) => new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const updateReviewForm = (bookingId, patch) => {
    setReviewForms((forms) => ({
      ...forms,
      [bookingId]: { rating: 0, comment: '', ...(forms[bookingId] || {}), ...patch },
    }));
  };

  const submitReview = async (booking) => {
    const form = reviewForms[booking.booking_id] || {};
    if (!form.rating) {
      toast.error('Choose a star rating first.');
      return;
    }
    setSubmittingReview(booking.booking_id);
    try {
      const { data } = await api.post('/reviews/location', {
        booking_id: booking.booking_id,
        rating: form.rating,
        comment: form.comment?.trim() || undefined,
      });
      setBookings((items) => items.map((item) => (
        item.booking_id === booking.booking_id
          ? { ...item, location_review_id: data.review.review_id }
          : item
      )));
      toast.success('Review posted. Thank you!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not post review.');
    } finally {
      setSubmittingReview('');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-ink">My Bookings</h1>
      <p className="mt-1 text-sm text-ink/55">View your past and upcoming parking sessions.</p>

      <div className="mt-8 space-y-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 w-full rounded-2xl" />
          ))
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-asphalt/20 p-12 text-center">
            <p className="font-display text-lg font-semibold text-ink/50">No bookings yet</p>
            <p className="mt-2 text-sm text-ink/40">Find a spot on the map to get started.</p>
          </div>
        ) : (
          bookings.map((b) => (
            <div key={b.booking_id} className="card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold text-ink">{b.location_name}</h3>
                    <span className={`badge ${STATUS_COLORS[b.status] || 'badge-gray'}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-sm text-ink/60 mt-0.5">{b.address}</p>

                  <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                      <span className="text-ink/50">Vehicle:</span>
                      <span className="ml-2 font-mono font-medium text-ink uppercase">{b.vehicle_number}</span>
                    </div>
                    <div>
                      <span className="text-ink/50">Slot:</span>
                      <span className="ml-2 font-mono font-medium text-ink">{b.slot_number ?? '—'}</span>
                    </div>
                    <div>
                      <span className="text-ink/50">In:</span>
                      <span className="ml-2 text-ink">{fmtDate(b.start_time)}</span>
                    </div>
                    <div>
                      <span className="text-ink/50">Out:</span>
                      <span className="ml-2 text-ink">{fmtDate(b.end_time)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 sm:items-end">
                  <div className="text-right">
                    <p className="font-mono text-xl font-bold text-signal-dark">
                      ₹{b.total_amount || b.estimated_amount}
                    </p>
                    {b.overtime_amount > 0 && (
                      <p className="text-xs text-cone mt-0.5">+₹{b.overtime_amount} overtime</p>
                    )}
                  </div>
                  {['confirmed', 'checked_in'].includes(b.status) && (
                    <Button variant="primary" size="sm" onClick={() => openPass(b)}>
                      Show QR Pass
                    </Button>
                  )}
                </div>
              </div>
              {b.status === 'completed' && (
                <div className="mt-5 border-t border-asphalt/10 pt-4">
                  {b.location_review_id ? (
                    <p className="text-sm font-medium text-signal-dark">You reviewed this parking space.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-ink">Rate this parking space</span>
                        <StarRating
                          value={reviewForms[b.booking_id]?.rating || 0}
                          onChange={(rating) => updateReviewForm(b.booking_id, { rating })}
                          size="md"
                        />
                      </div>
                      <textarea
                        className="input min-h-20 resize-y"
                        maxLength={1000}
                        placeholder="Optional comment"
                        value={reviewForms[b.booking_id]?.comment || ''}
                        onChange={(e) => updateReviewForm(b.booking_id, { comment: e.target.value })}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        loading={submittingReview === b.booking_id}
                        onClick={() => submitReview(b)}
                      >
                        Submit review
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* QR Pass Modal */}
      {activePass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-asphalt/60 backdrop-blur-sm animate-fade-in" onClick={() => setActivePass(null)} />
          <div className="relative z-10 w-full max-w-sm">
            <QrPass
              booking={activePass.booking}
              qrDataUrl={activePass.qr_pass}
              onClose={() => setActivePass(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
