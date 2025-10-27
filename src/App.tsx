import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Home from '@/pages/Home';
import Demo from '@/pages/Demo';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiClient } from '@/lib/api';
import { useAuth, useAuthActions } from '@/hooks/useAuth';

function AuthInitializer() {
  const { hydrated, token, user } = useAuth();
  const { setAuth, clearAuth } = useAuthActions();

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token) {
      if (user) {
        clearAuth();
      }
      return;
    }

    if (user) {
      return;
    }

    let cancelled = false;

    (async () => {
      const response = await apiClient.getCurrentUser();
      if (cancelled) {
        return;
      }

      if (response.success && response.data) {
        setAuth({ user: response.data, token });
      } else if (response.status === 401) {
        clearAuth();
      }
    })().catch((error) => {
      console.error('Failed to verify session:', error);
      if (!cancelled) {
        clearAuth();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, token, user, setAuth, clearAuth]);

  return null;
}

function AuthEventBridge() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthActions();

  useEffect(() => {
    const handler = () => {
      clearAuth();
      navigate('/login', { replace: true });
    };

    window.addEventListener('app:unauthorized', handler);
    return () => {
      window.removeEventListener('app:unauthorized', handler);
    };
  }, [clearAuth, navigate]);

  return null;
}

export default function App() {
  return (
    <Router>
      <AuthInitializer />
      <AuthEventBridge />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/app"
          element={(
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          )}
        />
        <Route path="/demo/:id" element={<Demo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
