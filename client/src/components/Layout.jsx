import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">Cloud posture checker</div>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/scans/new">New scan</NavLink>
          <NavLink to="/scans" end>Scan history</NavLink>
        </nav>
        <div className="rail-foot">
          <p className="scope-note">
            This version scans mock JSON configurations only. Live AWS scanning, scheduled scans and natural-language
            queries are planned future work.
          </p>
          <div className="who">{user.name}</div>
          <button type="button" className="btn btn-ghost-light" onClick={onLogout}>Log out</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
