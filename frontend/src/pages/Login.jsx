import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'admin' ? '/admin' : user.role === 'driver' ? '/search' : '/host');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not log in — check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-65px)]">
      {/* ── Left decorative panel ── */}
      <div className="hidden flex-col justify-between overflow-hidden bg-asphalt p-12 lg:flex lg:w-5/12">
        <div className="relative h-full bg-lane-lines opacity-20 absolute inset-0 pointer-events-none rounded-2xl" aria-hidden="true" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 font-display text-xl font-bold text-chalk">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal text-sm font-bold">P</span>
            ParkSlot
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <blockquote className="font-display text-2xl font-bold leading-snug text-chalk">
            "The billing clock starts when you arrive — not when you book."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-signal/30 flex items-center justify-center font-display font-bold text-signal-light">
              V
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-chalk">Vikram Shah</p>
              <p className="text-xs text-chalk/50">Host · 120+ completed bookings · 4.9★</p>
            </div>
          </div>
          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-chalk/10">
            {[['14k+', 'Bookings'], ['3.2k', 'Hosts'], ['4.8★', 'Avg rating']].map(([v, l]) => (
              <div key={l}>
                <p className="font-display text-2xl font-bold text-signal-light">{v}</p>
                <p className="text-xs text-chalk/45 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-16 bg-chalk">
        <div className="w-full max-w-md animate-fade-up">
          <h1 className="font-display text-3xl font-bold text-ink">Log in to ParkSlot</h1>
          <p className="mt-2 text-sm text-ink/55">
            Book a slot, manage a listing, or open the admin panel.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="input-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="input-label" htmlFor="login-password">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'} required value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input pr-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              {loading ? 'Logging in…' : 'Log in'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-ink/55">
            New here?{' '}
            <Link to="/signup" className="font-semibold text-signal hover:text-signal-dark transition-colors">
              Create an account
            </Link>
          </p>

          {/* Demo credentials hint */}
          <div className="mt-6 rounded-xl border border-asphalt/10 bg-asphalt/4 p-4 text-xs text-ink/50">
            <p className="font-semibold text-ink/70 mb-1">Demo credentials</p>
            <p>Driver: <span className="font-mono">asha.driver@example.com</span></p>
            <p>Host: <span className="font-mono">vikram.host@example.com</span></p>
            <p>Admin: <span className="font-mono">admin@parkshare.app</span></p>
            <p className="mt-1">Password: <span className="font-mono">Password123!</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
