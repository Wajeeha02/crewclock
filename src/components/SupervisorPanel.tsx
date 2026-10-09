// src/components/SupervisorPanel.tsx
import { useState } from 'react';
import type { TimeEntry, Job, UserProfile } from '../types';
import { diffMs, hoursDecimal } from '../utils/time';
import JustificationModal from './JustificationModal';
import { generatePayrollCSV } from '../utils/payrollExport';

interface SupervisorPanelProps {
    currentUser: UserProfile;
    users: UserProfile[];
    entries: TimeEntry[];
    jobs: Job[];
    approveEntry: (id: string, approvedByUserId: string) => void;
    rejectEntry: (id: string) => void;
    editEntryWithJustification: (
        entryId: string,
        newStart: string,
        newEnd: string | null,
        justification: string,
        editedByUserId: string,
        editedByUserName: string
    ) => void;
    deleteEntry: (id: string) => void;
    canEditAndApprove: boolean;
}

export default function SupervisorPanel({
    currentUser,
    users,
    entries,
    jobs,
    approveEntry,
    rejectEntry,
    editEntryWithJustification,
    deleteEntry,
    canEditAndApprove,
}: SupervisorPanelProps) {
    const [activeTab, setActiveTab] = useState<'exceptions' | 'all' | 'employees'>('exceptions');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');

    // Justification Modal state
    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

    // Audit History Viewer modal
    const [viewingHistoryEntry, setViewingHistoryEntry] = useState<TimeEntry | null>(null);

    const getJobName = (jId: string) => jobs.find((j) => j.id === jId)?.name || 'Unknown Job';
    const getJobColor = (jId: string) => jobs.find((j) => j.id === jId)?.color || '#888';
    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Filter finished time entries
    const completedEntries = entries.filter((e) => e.end && e.jobId !== 'break');

    // Exceptions list (outside radius, gps denied, manual edits, pending review)
    const flaggedEntries = completedEntries.filter(
        (e) => e.supervisorStatus === 'pending' || e.locationFlag !== null
    );

    // Apply Employee filter if selected
    const filteredEntries = completedEntries.filter((e) => {
        if (selectedEmployeeId !== 'all' && e.userId !== selectedEmployeeId) return false;
        return true;
    });

    const displayEntries = activeTab === 'exceptions'
        ? flaggedEntries.filter(e => selectedEmployeeId === 'all' || e.userId === selectedEmployeeId)
        : filteredEntries;

    // Totals calculations
    const totalHours = filteredEntries.reduce((s, e) => s + diffMs(e.start, e.end!), 0);
    const approvedHours = filteredEntries.filter((e) => e.supervisorStatus === 'approved').reduce((s, e) => s + diffMs(e.start, e.end!), 0);
    const pendingCount = flaggedEntries.length;

    // Save Edit with Justification handler
    const handleSaveEdit = (newStart: string, newEnd: string | null, justification: string) => {
        if (editingEntry) {
            editEntryWithJustification(
                editingEntry.id,
                newStart,
                newEnd,
                justification,
                currentUser.id,
                currentUser.name
            );
            setEditingEntry(null);
        }
    };

    return (
        <div className="supervisor-page">
            <div className="page-header">
                <div>
                    <span className="section-eyebrow">T29 MANAGEMENT & AUDIT CONTROL</span>
                    <h2>Supervisor Exception & Payroll Dashboard</h2>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {canEditAndApprove && (
                        <button className="btn-dark" onClick={() => generatePayrollCSV(entries, users)}>
                            ⬇ Export Payroll (CSV)
                        </button>
                    )}
                    <div className="role-permission-pill" style={{ margin: 0 }}>
                        Current Permission Level: <strong>{currentUser.role.replace('_', ' ').toUpperCase()}</strong>
                    </div>
                </div>
            </div>

            {/* Permission Check Notice */}
            {!canEditAndApprove && (
                <div className="permission-warning-banner">
                    <strong>Read-Only Mode:</strong> Your role ({currentUser.role}) does not have edit/approval rights. Switch to Super Admin or Supervisor persona in top header to approve or edit timesheets.
                </div>
            )}

            {/* Supervisor Key Metrics */}
            <div className="supervisor-stats">
                <div className="stat-card">
                    <p className="stat-label">Pending Exceptions</p>
                    <p className="stat-value flagged">{pendingCount}</p>
                    <span className="stat-sub">Requires supervisor review</span>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Approved Payroll Hours</p>
                    <p className="stat-value approved">{hoursDecimal(approvedHours)} h</p>
                    <span className="stat-sub">Ready for T29 export</span>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Total Recorded Hours</p>
                    <p className="stat-value">{hoursDecimal(totalHours)} h</p>
                    <span className="stat-sub">Across all employees</span>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Active Field Crew</p>
                    <p className="stat-value">{users.filter((u) => u.role === 'employee').length}</p>
                    <span className="stat-sub">Field & Onsite technicians</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="sup-filter-bar">
                <div className="sup-tabs">
                    <button
                        className={`sup-tab ${activeTab === 'exceptions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('exceptions')}
                    >
                        Exception Flags & Pending ({flaggedEntries.length})
                    </button>
                    <button
                        className={`sup-tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All Time Entries ({completedEntries.length})
                    </button>
                    <button
                        className={`sup-tab ${activeTab === 'employees' ? 'active' : ''}`}
                        onClick={() => setActiveTab('employees')}
                    >
                        Employee Hours Breakdown
                    </button>
                </div>

                <div className="employee-filter-select">
                    <span className="filter-label">Filter Employee:</span>
                    <select
                        className="worker-select-dropdown"
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    >
                        <option value="all">All Workers</option>
                        {users.filter(u => u.role !== 'contractor').map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name} ({u.title})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Employee Breakdown View */}
            {activeTab === 'employees' && (
                <div className="employee-breakdown-grid">
                    {users
                        .filter((u) => u.role !== 'contractor')
                        .map((emp) => {
                            const empEntries = completedEntries.filter((e) => e.userId === emp.id);
                            const empHours = empEntries.reduce((s, e) => s + diffMs(e.start, e.end!), 0);
                            const empApproved = empEntries.filter((e) => e.supervisorStatus === 'approved').reduce((s, e) => s + diffMs(e.start, e.end!), 0);
                            const empFlags = empEntries.filter((e) => e.locationFlag !== null || e.supervisorStatus === 'pending').length;

                            return (
                                <div key={emp.id} className="employee-stat-card">
                                    <div className="emp-card-header">
                                        <span className="user-avatar">{emp.avatar}</span>
                                        <div>
                                            <h4>{emp.name}</h4>
                                            <span className="emp-title-tag">{emp.title} · ${emp.hourlyRate}/hr</span>
                                        </div>
                                    </div>

                                    <div className="emp-card-metrics">
                                        <div className="m-item">
                                            <span className="m-label">Total Hours</span>
                                            <span className="m-val">{hoursDecimal(empHours)} h</span>
                                        </div>
                                        <div className="m-item">
                                            <span className="m-label">Approved</span>
                                            <span className="m-val approved">{hoursDecimal(empApproved)} h</span>
                                        </div>
                                        <div className="m-item">
                                            <span className="m-label">Exceptions</span>
                                            <span className={`m-val ${empFlags > 0 ? 'flagged' : ''}`}>{empFlags}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Time Entries Cards */}
            {activeTab !== 'employees' && (
                <div className="sup-entries-stack">
                    {displayEntries.length === 0 ? (
                        <div className="sup-empty">
                            <span>
                                {activeTab === 'exceptions'
                                    ? ' No exception flags! All timesheets are clean & approved.'
                                    : 'No time entries recorded for this filter.'}
                            </span>
                        </div>
                    ) : (
                        displayEntries.map((e) => (
                            <div
                                key={e.id}
                                className={`sup-entry-card ${e.locationFlag ? 'flagged-card' : ''} ${e.supervisorStatus === 'rejected' ? 'rejected-card' : ''}`}
                            >
                                {/* Exception Banner */}
                                {e.locationFlag && (
                                    <div className="flag-banner">
                                        Exception Flag:{' '}
                                        {e.locationFlag === 'outside_radius' && 'Clocked in outside site geofence radius'}
                                        {e.locationFlag === 'gps_denied' && 'GPS unverified (location disabled)'}
                                        {e.locationFlag === 'manual_edit' && 'Manually edited by supervisor (Audit Justified)'}
                                    </div>
                                )}

                                <div className="sup-entry-main">
                                    <div className="sup-entry-left">
                                        <span className="job-dot" style={{ backgroundColor: getJobColor(e.jobId) }} />
                                        <div>
                                            <div className="user-name-title-row">
                                                <strong>{e.userName}</strong>
                                                <span className="job-name-tag">{getJobName(e.jobId)}</span>
                                                {e.workType === 'field' && <span className="field-tag-small">Field Mode</span>}
                                            </div>
                                            <p className="sup-entry-meta">
                                                {formatDate(e.start)} · Cost Code: <code>{e.segment}</code> · {formatTime(e.start)} – {e.end ? formatTime(e.end) : 'In progress'}
                                            </p>
                                            {e.notes && <p className="sup-entry-note">Notes: "{e.notes}"</p>}
                                        </div>
                                    </div>

                                    <div className="sup-entry-right">
                                        <span className="sup-hours">{hoursDecimal(diffMs(e.start, e.end!))} h</span>
                                        <span className={`sup-status-badge ${e.supervisorStatus}`}>{e.supervisorStatus.toUpperCase()}</span>
                                    </div>
                                </div>

                                {/* Audit Edit History Row */}
                                {e.editHistory.length > 0 && (
                                    <div className="audit-trail-inline">
                                        <span> Edit History: {e.editHistory.length} revision(s)</span>
                                        <button
                                            className="btn-link-sm"
                                            onClick={() => setViewingHistoryEntry(e)}
                                        >
                                            View Audit Justification Log
                                        </button>
                                    </div>
                                )}

                                {/* Action Buttons (Gated by T29 Permissions) */}
                                {canEditAndApprove && (
                                    <div className="sup-entry-actions">
                                        {e.supervisorStatus === 'pending' && (
                                            <>
                                                <button
                                                    className="sup-btn approve"
                                                    onClick={() => approveEntry(e.id, currentUser.id)}
                                                >
                                                    ✓ Approve Entry
                                                </button>
                                                <button
                                                    className="sup-btn reject"
                                                    onClick={() => rejectEntry(e.id)}
                                                >
                                                    ✕ Reject Entry
                                                </button>
                                            </>
                                        )}

                                        {e.supervisorStatus !== 'pending' && (
                                            <button
                                                className="sup-btn neutral"
                                                onClick={() => approveEntry(e.id, currentUser.id)}
                                            >
                                                ✓ Re-Approve
                                            </button>
                                        )}

                                        <button
                                            className="sup-btn edit"
                                            onClick={() => setEditingEntry(e)}
                                        >
                                            Edit Time (Requires Justification)
                                        </button>

                                        <button
                                            className="sup-btn delete"
                                            onClick={() => deleteEntry(e.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Mandatory Justification Modal */}
            {editingEntry && (
                <JustificationModal
                    entryInfo={{
                        id: editingEntry.id,
                        userName: editingEntry.userName,
                        jobName: getJobName(editingEntry.jobId),
                        currentStart: editingEntry.start,
                        currentEnd: editingEntry.end,
                    }}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingEntry(null)}
                />
            )}

            {/* Edit History Audit Drawer Modal */}
            {viewingHistoryEntry && (
                <div className="modal-overlay">
                    <div className="modal-sheet">
                        <h3> Permanent Audit History Log</h3>
                        <p className="modal-sub">
                            Audit trail for <strong>{viewingHistoryEntry.userName}</strong> on <strong>{getJobName(viewingHistoryEntry.jobId)}</strong>
                        </p>

                        <div className="audit-history-list">
                            {viewingHistoryEntry.editHistory.map((log) => (
                                <div key={log.id} className="audit-history-item">
                                    <div className="audit-item-top">
                                        <span className="edited-by-tag">Edited by: {log.editedByUserName}</span>
                                        <span className="audit-timestamp">{formatDate(log.editedAt)} at {formatTime(log.editedAt)}</span>
                                    </div>
                                    <div className="audit-time-diff">
                                        <span className="prev-time">Old: {formatTime(log.previousStart)} – {log.previousEnd ? formatTime(log.previousEnd) : 'Now'}</span>
                                        <span className="diff-arrow">→</span>
                                        <span className="new-time">New: {formatTime(log.newStart)} – {log.newEnd ? formatTime(log.newEnd) : 'Now'}</span>
                                    </div>
                                    <div className="justification-box">
                                        <strong>Written Justification Reason:</strong>
                                        <p>"{log.justification}"</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="modal-btns">
                            <button className="btn-dark" onClick={() => setViewingHistoryEntry(null)}>
                                Close Audit Log
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
