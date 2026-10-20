import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { Loading } from './components/Feedback.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewScan from './pages/NewScan.jsx';
import History from './pages/History.jsx';
import ScanDetail from './pages/ScanDetail.jsx';
import FindingDetail from './pages/FindingDetail.jsx';
import NotFound from './pages/NotFound.jsx';

// Pages inside this route are only shown to logged-in users.
function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

// Login and register pages bounce a logged-in user to the dashboard.
function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Checking your session" />;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="scans/new" element={<NewScan />} />
          <Route path="scans" element={<History />} />
          <Route path="scans/:scanId" element={<ScanDetail />} />
          <Route path="scans/:scanId/findings/:findingId" element={<FindingDetail />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
