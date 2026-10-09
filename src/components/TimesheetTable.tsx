// src/components/TimesheetTable.tsx
import { useNavigate } from 'react-router-dom';
import type { TimeEntry, Job, UserProfile } from '../types';
import { diffMs, hoursDecimal, isCurrentWeek } from '../utils/time';

interface TimesheetTableProps {
    entries: TimeEntry[];
    jobs: Job[];
    currentUser: UserProfile;
}

export default function TimesheetTable({ entries, jobs, currentUser }: TimesheetTableProps) {
    const navigate = useNavigate();

    // Employees only view their own entries or all entries if supervisor/admin
    const relevantEntries = currentUser.role === 'employee'
        ? entries.filter(e => e.userId === currentUser.id)
        : entries;

    const completed = relevantEntries.filter((e) => e.end && e.jobId !== 'break');

    const totalHours = completed.reduce((sum, e) => sum + diffMs(e.start, e.end!), 0);
    const approvedTotal = completed
        .filter((e) => e.supervisorStatus === 'approved')
        .reduce((sum, e) => sum + diffMs(e.start, e.end!), 0);

    const pendingCount = completed.filter((e) => e.supervisorStatus === 'pending').length;

    // Overtime Alert Logic
    const currentWeekEntries = completed.filter(e => isCurrentWeek(e.start));
    const hoursByUser: Record<string, { name: string, hours: number }> = {};
    currentWeekEntries.forEach(e => {
        const h = diffMs(e.start, e.end!) / 3600000;
        if (!hoursByUser[e.userId]) {
            hoursByUser[e.userId] = { name: e.userName, hours: 0 };
        }
        hoursByUser[e.userId].hours += h;
    });

    const overtimeAlerts = Object.values(hoursByUser).filter(u => u.hours >= 40);

    const getJobName = (jId: string) => jobs.find((j) => j.id === jId)?.name || 'Unknown Job';
    const getJobColor = (jId: string) => jobs.find((j) => j.id === jId)?.color || '#888';
    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className="timesheets-page">
            {/* Header */}
            <div className="ts-page-header">
                <div>
                    <span className="ts-eyebrow">AUTOMATED PAYROLL TIMESHEETS</span>
                    <h1 className="ts-title">Weekly Timesheet Record</h1>
                </div>
                <span className="week-pill">Week of {weekLabel}</span>
            </div>

            {/* Read-Only Notice for Employees */}
            {currentUser.role === 'employee' && (
                <div className="employee-readonly-banner">
                    <strong>Employee Policy:</strong> Timesheets are generated automatically from your GPS clock in/out timestamps. Employees cannot edit their own time. Any time modifications must be requested through your supervisor with a logged justification.
                </div>
            )}

            {/* Auto-calculated summary card */}
            <div className="ts-summary-block">
                <p className="ts-summary-label">Total Hours Recorded (Auto-Calculated)</p>
                <h2 className="ts-summary-hours">{hoursDecimal(totalHours)} h</h2>

                <div className="ts-summary-row">
                    <div className="ts-summary-sub">
                        <span className="ts-sub-label">Supervisor Approved</span>
                        <span className="ts-sub-value approved">{hoursDecimal(approvedTotal)} h</span>
                    </div>
                    {pendingCount > 0 && (
                        <div className="ts-summary-sub">
                            <span className="ts-sub-label">Pending Supervisor Review</span>
                            <span className="ts-sub-value pending">
                                {pendingCount} {pendingCount > 1 ? 'entries' : 'entry'}
                            </span>
                        </div>
                    )}
                </div>
                <p className="ts-auto-note">
                    ✓ All entries are timestamped and verified against geofence coordinates.
                </p>
                
                {overtimeAlerts.length > 0 && (
                    <div className="overtime-alerts" style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '1px solid var(--accent-red)', borderRadius: '8px', color: 'var(--accent-red)' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>⚠️ Overtime Alert (Week of {weekLabel})</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                            {overtimeAlerts.map(a => (
                                <li key={a.name}>
                                    <strong>{a.name}</strong> is approaching or exceeding overtime limits ({a.hours.toFixed(2)}h)
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="ts-divider" />

            {/* Timesheet List Table */}
            <div className="ts-entries-block">
                <div className="section-row-header">
                    <span className="section-label">Detailed Time Entries</span>
                    <span className="section-count">{completed.length} records</span>
                </div>

                {completed.length === 0 ? (
                    <div className="ts-empty-state">
                        <p>No time entries found for this period. Clock in to begin recording hours.</p>
                    </div>
                ) : (
                    <div className="timesheet-card-grid">
                        {completed.map((e) => (
                            <div
                                key={e.id}
                                className={`timesheet-card ${e.locationFlag ? 'flagged-card' : ''}`}
                            >
                                <div className="card-header">
                                    <div className="card-date-time">
                                        <span className="card-date">{formatDate(e.start)}</span>
                                        <span className="card-time">{formatTime(e.start)} – {formatTime(e.end!)}</span>
                                    </div>
                                    <div className="card-status-badge">
                                        {e.supervisorStatus === 'approved' && (
                                            <span className="badge approved">✓ Approved</span>
                                        )}
                                        {e.supervisorStatus === 'pending' && (
                                            <span className="badge pending">⏳ Pending</span>
                                        )}
                                        {e.supervisorStatus === 'rejected' && (
                                            <span className="badge rejected">✕ Rejected</span>
                                        )}
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="card-job">
                                        <span className="job-dot" style={{ backgroundColor: getJobColor(e.jobId) }} />
                                        <strong>{getJobName(e.jobId)}</strong>
                                    </div>
                                    <div className="card-user">
                                        👤 {e.userName}
                                        {e.workType === 'field' && <span className="tag field">Field Mode</span>}
                                    </div>
                                    <div className="card-cost-code">
                                        Cost Code: <code>{e.segment}</code>
                                    </div>
                                    
                                    {e.locationFlag && (
                                        <div className="card-alert">
                                            ⚠️ Flagged: {e.locationFlag === 'outside_radius' ? 'Outside Geofence Radius' : e.locationFlag === 'manual_edit' ? 'Edited with Justification' : 'GPS Disabled'}
                                        </div>
                                    )}
                                    {e.notes && <div className="card-note">"{e.notes}"</div>}
                                    {e.editHistory.length > 0 && (
                                        <div className="card-audit">
                                            ✏️ Supervisor Justification: "{e.editHistory[0].justification}" (by {e.editHistory[0].editedByUserName})
                                        </div>
                                    )}

                                    <div className="card-hours">
                                        <strong>{hoursDecimal(diffMs(e.start, e.end!))} h</strong> Total
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {pendingCount > 0 && (currentUser.role === 'super_admin' || currentUser.role === 'supervisor') && (
                <div className="ts-supervisor-cta">
                    <p>{pendingCount} entries require supervisor review and approval</p>
                    <button className="view-all-btn" onClick={() => navigate('/supervisor')}>
                        Go to T29 Supervisor Dashboard ↗
                    </button>
                </div>
            )}
        </div>
    );
}