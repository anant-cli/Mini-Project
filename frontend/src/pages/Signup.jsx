import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';

const ROLES = [
  { value: 'driver', label: 'Driver', hint: 'Search and book parking' },
  { value: 'host', label: 'Space owner', hint: 'List a driveway or lot' },
  { value: 'business_host', label: 'Business host', hint: 'Mall, hospital, office' },
];

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'driver' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
      navigate(form.role === 'driver' ? '/search' : '/host');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create your account — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-ink">Create your account</h1>
      <p className="mt-2 text-sm text-ink/60">One account can hold multiple roles later.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map((r) => (
            <button
              type="button" key={r.value}
              onClick={() => setForm({ ...form, role: r.value })}
              className={`rounded-lg border px-3 py-3 text-left text-xs transition-colors ${
                form.role === r.value ? 'border-signal bg-signal/10 text-signal-dark' : 'border-asphalt/15 text-ink/60 hover:border-signal/50'
              }`}
            >
              <div className="font-display font-semibold">{r.label}</div>
              <div className="mt-0.5 text-[11px] opacity-70">{r.hint}</div>
            </button>
          ))}
        </div>

        <input
          placeholder="Full name" required value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg border border-asphalt/15 px-4 py-3 text-sm outline-none focus:border-signal"
        />
        <input
          type="email" placeholder="Email" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-lg border border-asphalt/15 px-4 py-3 text-sm outline-none focus:border-signal"
        />
        <input
          placeholder="Phone" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full rounded-lg border border-asphalt/15 px-4 py-3 text-sm outline-none focus:border-signal"
        />
        <input
          type="password" placeholder="Password (min 8 characters)" required minLength={8} value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full rounded-lg border border-asphalt/15 px-4 py-3 text-sm outline-none focus:border-signal"
        />

        {error && <p className="text-sm text-cone">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink/60">
        Already have an account? <Link to="/login" className="font-medium text-signal hover:underline">Log in</Link>
      </p>
    </div>
  );
}
