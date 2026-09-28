// components/SupervisorPanel.tsx
import { useState } from 'react';
import { JOBS, TASKS } from '../data/jobs';
import type { Job } from '../data/jobs';
import { diffMs, hoursDecimal } from '../utils/time';
import type { TimeEntry } from '../hooks/useTimeEntries';

export default function SupervisorPanel({
    entries, approveEntry, rejectEntry, editEntryTime,
    supervisorUnlocked, checkSupervisorPin, lockSupervisor
}: any) {

    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editStart, setEditStart] = useState('');
    const [editEnd, setEditEnd] = useState('');
    const [activeTab, setActiveTab] = useState<'flagged' | 'all'>('flagged');

    const handlePinSubmit = () => {
        const ok = checkSupervisorPin(pin);
        if (!ok) { setPinError(true); setPin(''); }
    };

    const getJobName = (jId: string) => JOBS.find((j: Job) => j.id === jId)?.name || 'Unknown';
    const getJobColor = (jId: string) => JOBS.find((j: Job) => j.id === jId)?.color || '#888';
    const getTaskName = (tId: string) => TASKS.find((t) => t.id === tId)?.name || '—';
    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const startEdit = (e: any) => {
        setEditingId(e.id);
        setEditStart(new Date(e.start).toISOString().slice(0, 16));
        setEditEnd(e.end ? new Date(e.end).toISOString().slice(0, 16) : '');
    };

    const saveEdit = () => {
        if (editingId) {
            editEntryTime(editingId, new Date(editStart).toISOString(), editEnd ? new Date(editEnd).toISOString() : null);
            setEditingId(null);
        }
    };

    const displayEntries: TimeEntry[] = entries.filter((e: TimeEntry) => e.end && e.jobId !== 'break');
    const flagged = displayEntries.filter((e: TimeEntry) => e.supervisorStatus === 'pending');
    const allEntries = displayEntries;
    const shown = activeTab === 'flagged' ? flagged : allEntries;

    const totalHours = allEntries.reduce((s: number, e: TimeEntry) => s + diffMs(e.start, e.end!), 0);
    const approvedHours = allEntries.filter((e: TimeEntry) => e.supervisorStatus === 'approved').reduce((s: number, e: TimeEntry) => s + diffMs(e.start, e.end!), 0);

    // ─── PIN Gate ───────────────────────────────────────────────────────────
    if (!supervisorUnlocked) {
        return (
            <div className="clock-page">
                <div className="page-header">
                    <p className="page-header-date">Supervisor Access</p>
                </div>
                <div className="supervisor-pin-card">
                    <div className="supervisor-icon">🔐</div>
                    <h3>Supervisor Mode</h3>
                    <p className="pin-desc">Enter your supervisor PIN to review and approve time entries.</p>
                    <div className="pin-row">
                        <input
                            type="password"
                            className={`pin-input ${pinError ? 'error' : ''}`}
                            placeholder="Enter PIN"
                            value={pin}
                            maxLength={6}
                            onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                        />
                        <button className="btn-dark" onClick={handlePinSubmit}>Unlock</button>
                    </div>
                    {pinError && <p className="pin-error">Incorrect PIN. Try again.</p>}
                    <p className="pin-hint">Default PIN for demo: <code>1234</code></p>
                </div>
            </div>
        );
    }

    // ─── Supervisor Dashboard ─────────────────────────────────────────────
    return (
        <div className="clock-page">
            <div className="page-header">
                <div>
                    <p className="page-header-date">Supervisor Dashboard</p>
                </div>
                <button className="btn-ghost-sm" onClick={lockSupervisor}>🔒 Lock</button>
            </div>

            {/* Stats row */}
            <div className="supervisor-stats">
                <div className="stat-card">
                    <p className="stat-label">Total entries</p>
                    <p className="stat-value">{allEntries.length}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Pending review</p>
                    <p className="stat-value flagged">{flagged.length}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Approved hours</p>
                    <p className="stat-value">{hoursDecimal(approvedHours)} h</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Total hours</p>
                    <p className="stat-value">{hoursDecimal(totalHours)} h</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="sup-tabs">
                <button className={`sup-tab ${activeTab === 'flagged' ? 'active' : ''}`} onClick={() => setActiveTab('flagged')}>
                    ⚠ Pending ({flagged.length})
                </button>
                <button className={`sup-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
                    All Entries ({allEntries.length})
                </button>
            </div>

            {/* Entries */}
            <div className="sup-entries">
                {shown.length === 0 && (
                    <div className="sup-empty">
                        <span>{activeTab === 'flagged' ? '✅ No entries need review!' : 'No entries yet.'}</span>
                    </div>
                )}
                {shown.map((e: any) => (
                    <div key={e.id} className={`sup-entry-card ${e.locationFlag ? 'flagged-card' : ''} ${e.supervisorStatus === 'rejected' ? 'rejected-card' : ''}`}>
                        {/* Location flag banner */}
                        {e.locationFlag && (
                            <div className="flag-banner">
                                {e.locationFlag === 'gps_denied'
                                    ? '🚫 GPS was off when clocked in — location unverified'
                                    : '📍 Clocked in outside the job site geofence'
                                }
                            </div>
                        )}

                        {/* Entry details */}
                        <div className="sup-entry-main">
                            <div className="sup-entry-left">
                                <span className="job-dot" style={{ backgroundColor: getJobColor(e.jobId) }} />
                                <div>
                                    <strong>{getJobName(e.jobId)}</strong>
                                    <p className="sup-entry-meta">
                                        {formatDate(e.start)} · {getTaskName(e.taskId)} · {formatTime(e.start)} – {e.end ? formatTime(e.end) : 'In progress'}
                                        {e.workType === 'field' && <span className="field-tag-small"> · 🚗 Field</span>}
                                    </p>
                                    {e.notes && <p className="sup-entry-note">"{e.notes}"</p>}
                                </div>
                            </div>
                            <div className="sup-entry-right">
                                <span className="sup-hours">{e.end ? hoursDecimal(diffMs(e.start, e.end)) : '—'} h</span>
                                <span className={`sup-status-badge ${e.supervisorStatus}`}>{e.supervisorStatus}</span>
                            </div>
                        </div>

                        {/* Edit form */}
                        {editingId === e.id ? (
                            <div className="edit-form">
                                <div className="edit-row">
                                    <label>Clock in</label>
                                    <input type="datetime-local" className="edit-input" value={editStart} onChange={ev => setEditStart(ev.target.value)} />
                                </div>
                                <div className="edit-row">
                                    <label>Clock out</label>
                                    <input type="datetime-local" className="edit-input" value={editEnd} onChange={ev => setEditEnd(ev.target.value)} />
                                </div>
                                <div className="edit-actions">
                                    <button className="btn-dark-sm" onClick={saveEdit}>Save changes</button>
                                    <button className="btn-ghost-sm" onClick={() => setEditingId(null)}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="sup-entry-actions">
                                {e.supervisorStatus === 'pending' && <>
                                    <button className="sup-btn approve" onClick={() => approveEntry(e.id)}>✓ Approve</button>
                                    <button className="sup-btn reject" onClick={() => rejectEntry(e.id)}>✕ Reject</button>
                                </>}
                                {e.supervisorStatus !== 'pending' && (
                                    <button className="sup-btn neutral" onClick={() => approveEntry(e.id)}>↩ Re-approve</button>
                                )}
                                <button className="sup-btn edit" onClick={() => startEdit(e)}>✏ Edit time</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
