import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { HOME_BY_ROLE } from '../utils/constants.js';
import { Spinner } from '../components/Spinner.jsx';

export function ProtectedRoute({ allow, children }) {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" label="Restoring your session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Signing in as a student and then typing /admin must bounce back, not render.
  if (allow && !allow.includes(role)) {
    return <Navigate to={HOME_BY_ROLE[role]} replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to={HOME_BY_ROLE[role]} replace />;
  return children;
}
