// App.tsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useTimeEntries } from './hooks/useTimeEntries';
import ClockPanel from './components/ClockPanel';
import TimesheetTable from './components/TimesheetTable';
import SupervisorPanel from './components/SupervisorPanel';

export default function App() {
  const store = useTimeEntries();
  const flagCount = store.flaggedEntries?.length ?? 0;

  return (
    <BrowserRouter>
      <div className="app-shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="brand-logo">
              <span className="brand-logo-text">CREWCLOCK.</span>
            </div>
            <nav className="sidebar-nav">
              <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>
                Clock
              </NavLink>
              <NavLink to="/timesheets" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                Timesheets
              </NavLink>
              <NavLink to="/supervisor" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                Supervisor
                {flagCount > 0 && <span className="nav-badge">{flagCount}</span>}
              </NavLink>
            </nav>
          </div>
          <div className="sidebar-bottom">
            <div className="user-avatar-block">
              <div className="user-avatar">CC</div>
              <div className="user-info">
                <span className="user-name">CrewClock</span>
                <span className="user-role">Field workspace</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ClockPanel {...store} />} />
            <Route path="/timesheets" element={
              <TimesheetTable entries={store.entries} />
            } />
            <Route path="/supervisor" element={<SupervisorPanel {...store} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}