// src/components/TimesheetTable.tsx
import { useNavigate } from 'react-router-dom';
import type { TimeEntry, Job, UserProfile } from '../types';
import { diffMs, hoursDecimal } from '../utils/time';

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
                    <div className="entries-list-flat">
                        {completed.map((e) => (
                            <div
                                key={e.id}
                                className={`entry-row ${e.locationFlag ? 'entry-row-flagged' : ''}`}
                            >
                                <div className="entry-row-today">{formatDate(e.start)}</div>

                                <div className="entry-row-info">
                                    <div className="entry-job-name-row">
                                        <span className="job-dot-sm" style={{ backgroundColor: getJobColor(e.jobId) }} />
                                        <strong>{getJobName(e.jobId)}</strong>
                                        <span className="user-tag-small">👤 {e.userName}</span>
                                        {e.workType === 'field' && <span className="entry-field-tag">Field Mode</span>}
                                    </div>

                                    <span>
                                        Cost Code: <code>{e.segment}</code> · {formatTime(e.start)} – {formatTime(e.end!)}
                                    </span>

                                    {e.locationFlag && (
                                        <span className="entry-flag-text">
                                            Flagged: {e.locationFlag === 'outside_radius' ? 'Outside Geofence Radius' : e.locationFlag === 'manual_edit' ? 'Edited with Justification' : 'GPS Disabled'}
                                        </span>
                                    )}

                                    {e.notes && <span className="entry-note-text">"{e.notes}"</span>}

                                    {e.editHistory.length > 0 && (
                                        <span className="justification-audit-text">
                                            ✏️ Supervisor Justification: "{e.editHistory[0].justification}" (by {e.editHistory[0].editedByUserName})
                                        </span>
                                    )}
                                </div>

                                <div className="entry-row-right">
                                    <span className="entry-hours-label">
                                        {hoursDecimal(diffMs(e.start, e.end!))} h
                                    </span>
                                    {e.supervisorStatus === 'approved' && (
                                        <span className="synced-label">✓ Approved</span>
                                    )}
                                    {e.supervisorStatus === 'pending' && (
                                        <span className="pending-label">⏳ Pending</span>
                                    )}
                                    {e.supervisorStatus === 'rejected' && (
                                        <span className="rejected-label">✕ Rejected</span>
                                    )}
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