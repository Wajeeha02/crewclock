// src/App.tsx
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useTimeEntries } from './hooks/useTimeEntries';
import ClockPanel from './components/ClockPanel';
import TimesheetTable from './components/TimesheetTable';
import SupervisorPanel from './components/SupervisorPanel';
import JobDispatchPanel from './components/JobDispatchPanel';
import PTOPanel from './components/PTOPanel';
import ContractorPortal from './components/ContractorPortal';
import LandingLogin from './components/LandingLogin';

export default function App() {
  const store = useTimeEntries();

  // If user hasn't selected a persona yet, show landing login
  if (!store.currentUser) {
    return (
      <LandingLogin
        users={store.users}
        onSelectUser={(uId) => store.switchActiveUser(uId)}
      />
    );
  }

  const { currentUser, switchActiveUser, isContractorOnly, canEditAndApprove, canManageJobs, pendingExceptionsCount } = store;

  // Contractor View Special Scoping (Security restriction: Contractors get no T29 internal access)
  if (isContractorOnly) {
    return (
      <div className="contractor-shell">
        <header className="contractor-header">
          <div className="brand-logo-text">CREWCLOCK. VENDOR PORTAL</div>
          <div className="user-persona-switcher">
            <span className="persona-label">Active Contractor:</span>
            <select
              className="persona-dropdown"
              value={currentUser.id}
              onChange={(e) => switchActiveUser(e.target.value)}
            >
              {store.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </header>
        <main className="main-content-standalone">
          <ContractorPortal
            currentUser={currentUser}
            equipmentList={store.equipmentList}
            contractorLogs={store.contractorLogs}
            onLogStart={store.startContractorUnitLog}
            onLogSwitch={store.switchContractorUnitLog}
            onLogEnd={store.endContractorUnitLog}
            onValidateLog={store.validateContractorLog}
            isT29View={false}
          />
        </main>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="brand-logo">
              <span className="brand-logo-text">CREWCLOCK.</span>
              <span className="brand-sub-badge">SES T29 Edition</span>
            </div>

            {/* Role / Permission Tag */}
            <div className="sidebar-role-indicator">
              <span className={`role-tag ${currentUser.role}`}>
                {currentUser.role.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <nav className="sidebar-nav">
              <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                Clock & Kiosk
              </NavLink>

              <NavLink to="/dispatch" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                Job Dispatch
              </NavLink>

              <NavLink to="/timesheets" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                Timesheets
              </NavLink>

              {(currentUser.role === 'super_admin' || currentUser.role === 'supervisor') && (
                <NavLink to="/supervisor" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                  T29 Supervisor
                  {pendingExceptionsCount > 0 && <span className="nav-badge">{pendingExceptionsCount}</span>}
                </NavLink>
              )}

              <NavLink to="/pto" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                PTO Center
              </NavLink>

              <NavLink to="/contractor-audit" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                Contractor Hours
              </NavLink>
            </nav>
          </div>

          {/* Sidebar Bottom User & Persona Quick Switcher */}
          <div className="sidebar-bottom">
            <div className="user-persona-box">
              <span className="user-persona-title">Switch Active Role Persona:</span>
              <select
                className="persona-dropdown"
                value={currentUser.id}
                onChange={(e) => switchActiveUser(e.target.value)}
              >
                {store.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div className="user-avatar-block">
              <div className="user-avatar">{currentUser.avatar}</div>
              <div className="user-info">
                <span className="user-name">{currentUser.name}</span>
                <span className="user-role">{currentUser.title}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content View */}
        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={
                <ClockPanel
                  currentUser={currentUser}
                  users={store.users}
                  jobs={store.jobs}
                  activeEntry={store.activeEntry}
                  lastJobEntry={store.lastJobEntry}
                  clockIn={store.clockIn}
                  clockOut={store.clockOut}
                  switchActiveUser={store.switchActiveUser}
                  onUpdateJob={store.updateJob}
                />
              }
            />

            <Route
              path="/dispatch"
              element={
                <JobDispatchPanel
                  jobs={store.jobs}
                  users={store.users}
                  entries={store.entries}
                  shifts={store.shifts}
                  onAddShift={store.addShift}
                  onAddJob={store.addJob}
                  onUpdateJob={store.updateJob}
                  onDeleteJob={store.deleteJob}
                  onResetJobs={store.resetJobs}
                  canManageJobs={canManageJobs}
                />
              }
            />

            <Route
              path="/timesheets"
              element={
                <TimesheetTable
                  entries={store.entries}
                  jobs={store.jobs}
                  currentUser={currentUser}
                />
              }
            />

            <Route
              path="/supervisor"
              element={
                <SupervisorPanel
                  currentUser={currentUser}
                  users={store.users}
                  entries={store.entries}
                  jobs={store.jobs}
                  approveEntry={store.approveEntry}
                  rejectEntry={store.rejectEntry}
                  editEntryWithJustification={store.editEntryWithJustification}
                  deleteEntry={store.deleteEntry}
                  canEditAndApprove={canEditAndApprove}
                />
              }
            />

            <Route
              path="/pto"
              element={
                <PTOPanel
                  currentUser={currentUser}
                  users={store.users}
                  ptoRequests={store.ptoRequests}
                  onRequestPTO={store.requestPTO}
                  onReviewPTO={store.reviewPTO}
                  canApprovePTO={currentUser.role === 'super_admin' || currentUser.role === 'supervisor'}
                />
              }
            />

            <Route
              path="/contractor-audit"
              element={
                <ContractorPortal
                  currentUser={currentUser}
                  equipmentList={store.equipmentList}
                  contractorLogs={store.contractorLogs}
                  onLogStart={store.startContractorUnitLog}
                  onLogSwitch={store.switchContractorUnitLog}
                  onLogEnd={store.endContractorUnitLog}
                  onValidateLog={store.validateContractorLog}
                  isT29View={true}
                />
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}