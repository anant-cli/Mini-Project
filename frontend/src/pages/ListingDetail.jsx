import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import Button from '../components/Button.jsx';
import BookingModal from '../components/BookingModal.jsx';
import SlotStatusGrid from '../components/SlotStatusGrid.jsx';
import { useToast } from '../components/Toast.jsx';
import StarRating from '../components/StarRating.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/listings/${id}`);
        setListing(data);
        const [{ data: reviewData }, favoriteResult] = await Promise.all([
          api.get(`/reviews/location/${id}`),
          user?.role === 'driver' ? api.get('/favorites/ids').catch(() => ({ data: { ids: [] } })) : Promise.resolve({ data: { ids: [] } }),
        ]);
        setReviews(reviewData.reviews || []);
        setSaved((favoriteResult.data.ids || []).includes(id));
      } catch (err) {
        toast.error('Could not load listing details.');
        navigate('/search');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate, toast, user?.role]);

  const toggleSaved = async () => {
    if (!user) {
      toast.info('Log in as a driver to save listings.');
      navigate('/login');
      return;
    }
    if (user.role !== 'driver') {
      toast.info('Only driver accounts can save listings.');
      return;
    }
    try {
      if (saved) {
        await api.delete(`/favorites/${id}`);
        setSaved(false);
        toast.success('Removed from saved listings.');
      } else {
        await api.post(`/favorites/${id}`);
        setSaved(true);
        toast.success('Saved listing.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update saved listing.');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="skeleton h-8 w-1/3 mb-4 rounded-lg" />
        <div className="skeleton h-4 w-1/4 mb-8 rounded-lg" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!listing) return null;

  const loc = listing.location;
  const slots = listing.slots || [];
  const openSlots = slots.filter((s) => s.status === 'available').length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-ink transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        Back
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-ink">{loc.name}</h1>
            {loc.has_ev_charging && <span className="badge badge-green shrink-0">⚡ EV Charging</span>}
            <button
              type="button"
              onClick={toggleSaved}
              className={`rounded-full border p-2 transition-colors ${saved ? 'border-cone bg-cone/8 text-cone' : 'border-asphalt/15 text-ink/45 hover:border-cone/40 hover:text-cone'}`}
              aria-label={saved ? 'Remove from saved listings' : 'Save listing'}
            >
              <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0 6.25-9 11-9 11s-9-4.75-9-11A5.25 5.25 0 0 1 12 4.5a5.25 5.25 0 0 1 9 3.75Z" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-ink/60">{loc.address}</p>
          <div className="mt-3 flex items-center gap-4 text-sm font-medium">
            <span className="flex items-center gap-1 text-signal-dark">
              <span className="text-[#F2A93B]">★</span> {loc.avg_rating ?? '4.5'}
            </span>
            <span className="text-ink/30">•</span>
            <span className={openSlots > 0 ? 'text-signal-dark' : 'text-cone'}>
              {openSlots} slots available
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end">
          <p className="font-mono text-3xl font-bold text-signal-dark">₹{loc.price_per_hour}</p>
          <p className="text-xs text-ink/50 uppercase tracking-wide">per hour</p>
          <Button
            variant="primary" size="lg" className="mt-4 w-full sm:w-auto"
            onClick={() => setShowBooking(true)}
            disabled={openSlots === 0}
          >
            {openSlots > 0 ? 'Book a slot' : 'Currently full'}
          </Button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {/* Left col */}
        <div className="md:col-span-2 space-y-8">
          <section className="card">
            <h2 className="font-display text-lg font-semibold text-ink mb-4">Live slot availability</h2>
            <SlotStatusGrid rows={2} cols={Math.min(loc.total_slots, 10)} slots={slots} />
            <div className="mt-4 flex gap-5 font-mono text-[11px] text-ink/55">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-signal" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-meter" /> Reserved</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-cone" /> Occupied</span>
            </div>
          </section>

          <section className="card">
            <h2 className="font-display text-lg font-semibold text-ink mb-4">Host information</h2>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-asphalt/10 font-display text-xl font-bold text-ink/60">
                {loc.host_name ? loc.host_name[0].toUpperCase() : 'H'}
              </div>
              <div>
                <p className="font-medium text-ink">{loc.host_name || 'Verified Host'}</p>
                <p className="text-sm text-ink/55">Joined ParkShare recently</p>
              </div>
            </div>
            <div className="mt-6 border-t border-asphalt/10 pt-4 flex gap-4 text-sm">
              <div className="flex flex-col">
                <span className="text-ink/50">Operating hours</span>
                <span className="font-medium text-ink">
                  {loc.operating_hours?.open || '00:00'} - {loc.operating_hours?.close || '23:59'}
                </span>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="font-display text-lg font-semibold text-ink mb-4">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-ink/50">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.review_id} className="border-b border-asphalt/10 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-ink">{review.author_name || 'Driver'}</p>
                      <StarRating value={review.rating} size="sm" />
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-ink/65">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right col */}
        <div className="space-y-6">
          <section className="card">
            <h2 className="font-display text-sm font-semibold text-ink mb-3">Allowed Vehicles</h2>
            <ul className="space-y-2 text-sm text-ink/70 capitalize">
              {(Array.isArray(loc.vehicle_types_allowed) ? loc.vehicle_types_allowed : ['car']).map((v) => (
                <li key={v} className="flex items-center gap-2">
                  <span className="text-signal">✓</span> {v.replace('_', ' ')}
                </li>
              ))}
            </ul>
          </section>

          {loc.has_ev_charging && (
            <section className="card border-signal/20 bg-signal/5">
              <h2 className="font-display text-sm font-semibold text-signal-dark mb-3">EV Charging Info</h2>
              <div className="space-y-3 text-sm text-ink/70">
                <div className="flex justify-between">
                  <span className="text-ink/50">Connector</span>
                  <span className="font-medium">{listing.ev_chargers?.[0]?.connector_type || 'Type-2'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/50">Power</span>
                  <span className="font-medium">{listing.ev_chargers?.[0]?.power_kw || '7'} kW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/50">Rate</span>
                  <span className="font-medium">₹{listing.ev_chargers?.[0]?.price_per_kwh || '8'} / kWh</span>
                </div>
              </div>
            </section>
          )}

          <section className="card bg-asphalt text-chalk border-none">
            <h2 className="font-display text-sm font-semibold mb-2">Escrow Protected</h2>
            <p className="text-xs text-chalk/60 leading-relaxed">
              Your payment is held by ParkShare until you check out. The host is only paid for the exact time you stay.
            </p>
          </section>
        </div>
      </div>

      {showBooking && (
        <BookingModal
          location={loc}
          slots={slots}
          onClose={() => setShowBooking(false)}
        />
      )}
    </div>
  );
}
