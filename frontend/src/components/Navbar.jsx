import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from './Button.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-asphalt/10 bg-chalk/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal text-chalk">P</span>
          ParkShare
        </Link>

        <div className="hidden items-center gap-8 font-body text-sm font-medium text-ink/70 md:flex">
          <Link to="/search" className="hover:text-signal">Find parking</Link>
          <Link to="/host" className="hover:text-signal">List your space</Link>
          {user?.role === 'admin' && <Link to="/admin" className="hover:text-signal">Admin</Link>}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden font-mono text-xs text-ink/60 sm:inline">{user.name}</span>
              <Button variant="outline" onClick={() => { logout(); navigate('/'); }}>Log out</Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost">Log in</Button>
              <Button as={Link} to="/signup" variant="primary">Sign up</Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
