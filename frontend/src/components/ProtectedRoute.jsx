import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Guards a route behind login, and optionally behind a set of roles.
 *
 * Usage:
 *   <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>} />
 *   <Route path="/bookings" element={<ProtectedRoute><BookingHistory /></ProtectedRoute>} />
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Auth state (GET /auth/me) hasn't resolved yet — avoid a flash-redirect.
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
