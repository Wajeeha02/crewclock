// App.tsx
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useTimeEntries } from './hooks/useTimeEntries';
import ClockPanel from './components/ClockPanel';
import TimesheetTable from './components/TimesheetTable';
import SupervisorPanel from './components/SupervisorPanel';
import LandingLogin from './components/LandingLogin';

export default function App() {
  const store = useTimeEntries();
  const flagCount = store.flaggedEntries?.length ?? 0;

  // If user hasn't selected a role yet, show the first landing login page
  if (store.userRole === 'none') {
    return (
      <LandingLogin
        onSupervisorLogin={(pin: string) => store.checkSupervisorPin(pin)}
        onEmployeeLogin={() => store.loginAsEmployee()}
      />
    );
  }

  const isSupervisor = store.userRole === 'supervisor' || store.supervisorUnlocked;

  return (
    <BrowserRouter>
      <div className="app-shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="brand-logo">
              <span className="brand-logo-text">CREWCLOCK.</span>
            </div>

            <div className="sidebar-role-indicator">
              <span className="role-tag">
                {isSupervisor ? 'Supervisor' : 'Employee'}
              </span>
            </div>

            <nav className="sidebar-nav">
              <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Clock
              </NavLink>
              <NavLink to="/timesheets" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Timesheets
              </NavLink>
              <NavLink to="/supervisor" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Supervisor & Jobs
                {flagCount > 0 && <span className="nav-badge">{flagCount}</span>}
              </NavLink>
            </nav>
          </div>

          <div className="sidebar-bottom">
            <div className="user-avatar-block">
              <div className="user-avatar">{isSupervisor ? 'SUP' : 'EMP'}</div>
              <div className="user-info">
                <span className="user-name">{isSupervisor ? 'Supervisor' : 'Employee User'}</span>
                <span className="user-role">{isSupervisor ? 'Full Access' : 'Clock & Sheets'}</span>
              </div>
            </div>
            <button className="sidebar-logout-btn" onClick={store.logoutRole}>
              Switch User / Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ClockPanel {...store} />} />
            <Route path="/timesheets" element={
              <TimesheetTable entries={store.entries} jobs={store.jobs} />
            } />
            <Route path="/supervisor" element={<SupervisorPanel {...store} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}