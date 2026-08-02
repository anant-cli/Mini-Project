import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/search');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not log in — check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-ink">Log in to ParkShare</h1>
      <p className="mt-2 text-sm text-ink/60">Book a slot, manage a listing, or open the admin panel.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">Email</label>
          <input
            type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-asphalt/15 px-4 py-3 text-sm outline-none focus:border-signal"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">Password</label>
          <input
            type="password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-asphalt/15 px-4 py-3 text-sm outline-none focus:border-signal"
          />
        </div>
        {error && <p className="text-sm text-cone">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink/60">
        New here? <Link to="/signup" className="font-medium text-signal hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
