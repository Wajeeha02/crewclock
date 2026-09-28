// components/TimesheetTable.tsx — auto-calculated, no manual input
import { useNavigate } from 'react-router-dom';
import { JOBS, TASKS } from '../data/jobs';
import type { Job } from '../data/jobs';
import { diffMs, hoursDecimal } from '../utils/time';
import type { TimeEntry } from '../hooks/useTimeEntries';

export default function TimesheetTable({ entries }: { entries: TimeEntry[] }) {
    const navigate = useNavigate();

    // Automatic calculation — only from actual start/end, never manual
    const done = entries.filter((e: any) => e.end && e.jobId !== 'break');
    const total = done.reduce((sum: number, e: any) => sum + diffMs(e.start, e.end), 0);
    const approvedTotal = done.filter((e: any) => e.supervisorStatus === 'approved').reduce((sum: number, e: any) => sum + diffMs(e.start, e.end), 0);
    const pendingCount = done.filter((e: any) => e.supervisorStatus === 'pending').length;

    const getJobName = (jId: string) => JOBS.find((j: Job) => j.id === jId)?.name || 'Unknown Job';
    const getJobColor = (jId: string) => JOBS.find((j: Job) => j.id === jId)?.color || '#888';
    const getTaskName = (tId: string) => TASKS.find((t) => t.id === tId)?.name || 'Task';
    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className="timesheets-page">
            {/* Header */}
            <div className="ts-page-header">
                <p className="ts-eyebrow">YOUR TIME</p>
                <div className="ts-title-row">
                    <h1 className="ts-title">This week</h1>
                    <span className="week-pill">Week of {weekLabel}</span>
                </div>
            </div>

            <div className="ts-divider" />

            {/* Auto-calculated summary — NEVER manually entered */}
            <div className="ts-summary-block">
                <p className="ts-summary-label">Total recorded</p>
                <h2 className="ts-summary-hours">{hoursDecimal(total)} h</h2>

                <div className="ts-summary-row">
                    <div className="ts-summary-sub">
                        <span className="ts-sub-label">Supervisor approved</span>
                        <span className="ts-sub-value approved">{hoursDecimal(approvedTotal)} h</span>
                    </div>
                    {pendingCount > 0 && (
                        <div className="ts-summary-sub">
                            <span className="ts-sub-label">⚠ Pending review</span>
                            <span className="ts-sub-value pending">{pendingCount} entr{pendingCount > 1 ? 'ies' : 'y'}</span>
                        </div>
                    )}
                </div>
                <p className="ts-auto-note">⚡ Hours are calculated automatically from your clock in/out timestamps</p>
            </div>

            <div className="ts-divider" />

            {/* Entries */}
            <div className="ts-entries-block">
                <div className="section-row-header">
                    <span className="section-label">Entries</span>
                    <span className="section-count">{done.length} record{done.length !== 1 ? 's' : ''}</span>
                </div>

                {done.length === 0 && (
                    <div className="ts-empty-state">
                        <p>🕐</p>
                        <p>No entries yet. Clock in to start tracking your time!</p>
                    </div>
                )}

                <div className="entries-list-flat">
                    {done.map((e: TimeEntry) => (
                        <div key={e.id} className={`entry-row ${e.locationFlag ? 'entry-row-flagged' : ''}`}>
                            <div className="entry-row-today">TODAY</div>
                            <div className="entry-row-info">
                                <div className="entry-job-name-row">
                                    <span className="job-dot-sm" style={{ backgroundColor: getJobColor(e.jobId) }} />
                                    <strong>{getJobName(e.jobId)}</strong>
                                    {e.workType === 'field' && <span className="entry-field-tag">🚗 Field</span>}
                                </div>
                                <span>
                                    {getTaskName(e.taskId ?? '')} · {formatTime(e.start)} – {formatTime(e.end ?? e.start)}
                                </span>
                                {e.locationFlag && (
                                    <span className="entry-flag-text">
                                        {e.locationFlag === 'gps_denied' ? '⚠ GPS was off' : '⚠ Outside geofence'}
                                    </span>
                                )}
                                {e.notes && <span className="entry-note-text">"{e.notes}"</span>}
                            </div>
                            <div className="entry-row-right">
                                {/* Auto-calculated — no manual input */}
                                <span className="entry-hours-label">{hoursDecimal(diffMs(e.start, e.end ?? undefined))} h</span>
                                {e.supervisorStatus === 'approved' && <span className="synced-label">✓ Approved</span>}
                                {e.supervisorStatus === 'pending' && <span className="pending-label">⏳ Pending</span>}
                                {e.supervisorStatus === 'rejected' && <span className="rejected-label">✕ Rejected</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {pendingCount > 0 && (
                <div className="ts-supervisor-cta">
                    <p>⚠ {pendingCount} entr{pendingCount > 1 ? 'ies need' : 'y needs'} supervisor review</p>
                    <button className="view-all-btn" onClick={() => navigate('/supervisor')}>
                        Go to Supervisor Panel ↗
                    </button>
                </div>
            )}
        </div>
    );
}