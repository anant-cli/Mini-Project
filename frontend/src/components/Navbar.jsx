import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from './Button.jsx';

const ROLE_LABELS = {
  driver:        { label: 'Driver',    cls: 'badge-green' },
  host:          { label: 'Host',      cls: 'badge-amber' },
  business_host: { label: 'Business',  cls: 'badge-amber' },
  admin:         { label: 'Admin',     cls: 'badge-red'   },
};

const navLinks = (role) => [
  { to: '/search',   label: 'Find parking' },
  { to: '/host',     label: 'List your space' },
  ...(role === 'driver' || role === 'admin' ? [{ to: '/bookings', label: 'My bookings' }] : []),
  ...(role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Detect scroll for subtle shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [navigate]);

  const links = navLinks(user?.role);
  const roleInfo = ROLE_LABELS[user?.role];

  const linkCls = ({ isActive }) =>
    `relative font-medium text-sm transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:scale-x-0 after:bg-signal after:transition-transform ${
      isActive
        ? 'text-signal after:scale-x-100'
        : 'text-ink/65 hover:text-signal hover:after:scale-x-100'
    }`;

  return (
    <header
      className={`sticky top-0 z-40 border-b border-asphalt/10 bg-chalk/90 backdrop-blur transition-shadow ${
        scrolled ? 'shadow-sm' : ''
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4" aria-label="Main navigation">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-bold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal text-chalk text-sm font-bold shadow-sm">
            P
          </span>
          ParkSlot
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Right side: user info + auth buttons */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden flex-col items-end sm:flex">
                <span className="font-display text-sm font-semibold text-ink leading-tight">{user.name}</span>
                {roleInfo && (
                  <span className={`mt-0.5 ${roleInfo.cls}`}>{roleInfo.label}</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { logout(); navigate('/'); }}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost" size="sm">Log in</Button>
              <Button as={Link} to="/signup" variant="primary" size="sm">Sign up</Button>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            className="ml-1 rounded-lg p-2 text-ink/60 hover:bg-asphalt/8 hover:text-ink transition-colors md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="animate-fade-up border-t border-asphalt/10 bg-chalk px-6 pb-5 pt-3 md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-signal/10 text-signal-dark' : 'text-ink/70 hover:bg-asphalt/6 hover:text-ink'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <button
                className="mt-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-cone hover:bg-cone/8 transition-colors"
                onClick={() => { logout(); navigate('/'); }}
              >
                Log out
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                <Button as={Link} to="/login" variant="outline" size="sm" className="flex-1">Log in</Button>
                <Button as={Link} to="/signup" variant="primary" size="sm" className="flex-1">Sign up</Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
