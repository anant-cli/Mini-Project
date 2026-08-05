import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import Button from '../components/Button.jsx';
import { useToast } from '../components/Toast.jsx';

export default function SavedListings() {
  const toast = useToast();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/favorites');
      setFavorites(data.favorites || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not load saved listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const removeFavorite = async (locationId) => {
    try {
      await api.delete(`/favorites/${locationId}`);
      setFavorites((items) => items.filter((item) => item.location_id !== locationId));
      toast.success('Removed from saved listings.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not remove saved listing.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Saved listings</h1>
          <p className="mt-1 text-sm text-ink/55">Parking spaces you want to find again quickly.</p>
        </div>
        <Button as={Link} to="/search" variant="outline" size="sm">
          Find parking
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {loading ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-36 rounded-2xl" />)
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-asphalt/20 p-12 text-center sm:col-span-2">
            <p className="font-display text-lg font-semibold text-ink/50">No saved listings yet</p>
            <p className="mt-2 text-sm text-ink/40">Tap the heart on a listing to save it here.</p>
          </div>
        ) : (
          favorites.map((loc) => (
            <div key={loc.location_id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold text-ink truncate">{loc.name}</h3>
                  <p className="mt-1 text-sm text-ink/55">{loc.address}</p>
                </div>
                {loc.has_ev_charging && <span className="badge badge-green shrink-0">EV</span>}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xl font-bold text-signal-dark">₹{loc.price_per_hour}</span>
                  <span className="text-xs text-ink/45">/hr</span>
                </div>
                <span className={`badge ${Number(loc.available_slots) > 0 ? 'badge-green' : 'badge-red'}`}>
                  {Number(loc.available_slots) > 0 ? `${loc.available_slots} open` : 'Full'}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button as={Link} to={`/listing/${loc.location_id}`} variant="primary" size="sm" className="flex-1">
                  View
                </Button>
                <Button variant="outline" size="sm" onClick={() => removeFavorite(loc.location_id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
