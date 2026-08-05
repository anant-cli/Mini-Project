import { Link } from 'react-router-dom';
import Button from '../components/Button.jsx';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <p className="font-mono text-sm font-semibold uppercase tracking-wide text-signal-dark">404</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-ink">Page not found</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/55">
        That ParkShare page does not exist or has moved.
      </p>
      <Button as={Link} to="/search" variant="primary" className="mt-6">
        Find parking
      </Button>
    </div>
  );
}
