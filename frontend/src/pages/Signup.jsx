import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import { useToast } from '../components/Toast.jsx';

const ROLES = [
  {
    value: 'driver',
    label: 'Driver',
    hint: 'Search and book parking',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    value: 'host',
    label: 'Space owner',
    hint: 'List a driveway or lot',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    value: 'business_host',
    label: 'Business host',
    hint: 'Mall, hospital, office',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
];

/* Password strength meter */
function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const strength = checks.filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-cone', 'bg-meter', 'bg-meter-light', 'bg-signal'];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              n <= strength ? colors[strength] : 'bg-asphalt/10'
            }`}
          />
        ))}
      </div>
      <p className={`mt-1 text-[11px] font-medium ${
        strength === 4 ? 'text-signal-dark' : strength >= 3 ? 'text-meter' : 'text-cone'
      }`}>
        {labels[strength]}
      </p>
    </div>
  );
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'driver' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signup(form);
      toast.success(`Account created! Welcome, ${user.name}.`);
      navigate(form.role === 'driver' ? '/search' : '/host');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create your account — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-65px)]">
      {/* ── Left decorative panel ── */}
      <div className="hidden flex-col justify-between overflow-hidden bg-asphalt p-12 lg:flex lg:w-5/12">
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 font-display text-xl font-bold text-chalk">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal text-sm font-bold">P</span>
            ParkSlot
          </div>
        </div>
        <div className="relative z-10 space-y-5">
          <h2 className="font-display text-2xl font-bold text-chalk leading-snug">
            Join the parking marketplace that{' '}
            <span className="text-signal">actually works for both sides</span>
          </h2>
          <ul className="space-y-3">
            {[
              { role: 'Driver', text: 'Book verified spots with live availability' },
              { role: 'Host', text: 'Earn from unused space, guaranteed payouts' },
              { role: 'Business', text: 'Bulk listings and staff gate access' },
            ].map((item) => (
              <li key={item.role} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal/20 text-signal">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                </span>
                <div>
                  <span className="font-display text-sm font-semibold text-chalk">{item.role}: </span>
                  <span className="text-sm text-chalk/55">{item.text}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="font-mono text-xs text-chalk/35">
            One account can hold both driver and host roles.
          </p>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-chalk">
        <div className="w-full max-w-md animate-fade-up">
          <h1 className="font-display text-3xl font-bold text-ink">Create your account</h1>
          <p className="mt-2 text-sm text-ink/55">One account, multiple roles — upgrade anytime.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {/* Role selector */}
            <div>
              <label className="input-label">I want to…</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm({ ...form, role: r.value })}
                    aria-pressed={form.role === r.value}
                    className={[
                      'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3.5 text-center transition-all',
                      form.role === r.value
                        ? 'border-signal bg-signal/10 text-signal-dark scale-[1.02]'
                        : 'border-asphalt/15 text-ink/55 hover:border-signal/40 hover:bg-signal/4',
                    ].join(' ')}
                  >
                    {r.icon}
                    <span className="font-display text-xs font-semibold">{r.label}</span>
                    <span className="text-[10px] opacity-70 leading-tight">{r.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="input-label" htmlFor="su-name">Full name</label>
              <input
                id="su-name"
                className="input" placeholder="Asha Rao" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="input-label" htmlFor="su-email">Email</label>
              <input
                id="su-email"
                type="email" className="input" placeholder="you@example.com" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="input-label" htmlFor="su-phone">Phone <span className="normal-case font-normal text-ink/35">(optional)</span></label>
              <input
                id="su-phone"
                type="tel" className="input" placeholder="98765 00001" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                autoComplete="tel"
              />
            </div>

            {/* Password */}
            <div>
              <label className="input-label" htmlFor="su-password">Password</label>
              <div className="relative">
                <input
                  id="su-password"
                  type={showPass ? 'text' : 'password'}
                  className="input pr-11"
                  placeholder="Min 8 characters"
                  required minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
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
              <PasswordStrength password={form.password} />
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-ink/55">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-signal hover:text-signal-dark transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
