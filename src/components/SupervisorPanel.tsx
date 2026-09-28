// components/SupervisorPanel.tsx
import { useState } from 'react';
import { TASKS } from '../data/jobs';
import type { Job } from '../data/jobs';
import { diffMs, hoursDecimal } from '../utils/time';
import type { TimeEntry } from '../hooks/useTimeEntries';

export default function SupervisorPanel({
    entries, jobs = [], updateJob, deleteJob, addJob, resetDummyJobs,
    approveEntry, rejectEntry, editEntryTime,
    supervisorUnlocked, checkSupervisorPin, lockSupervisor
}: any) {

    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editStart, setEditStart] = useState('');
    const [editEnd, setEditEnd] = useState('');
    const [activeTab, setActiveTab] = useState<'flagged' | 'all' | 'jobs'>('jobs'); // default or flagged

    // Job Editing State
    const [editingJobId, setEditingJobId] = useState<string | null>(null);
    const [editJobAddress, setEditJobAddress] = useState('');
    const [editJobLat, setEditJobLat] = useState(0);
    const [editJobLng, setEditJobLng] = useState(0);
    const [editJobRadius, setEditJobRadius] = useState(0);

    // New Job State
    const [showAddJobModal, setShowAddJobModal] = useState(false);
    const [newJobName, setNewJobName] = useState('');
    const [newJobAddress, setNewJobAddress] = useState('');
    const [newJobColor, setNewJobColor] = useState('#3B82F6');
    const [newJobLat, setNewJobLat] = useState(37.7749);
    const [newJobLng, setNewJobLng] = useState(-122.4194);
    const [newJobRadius, setNewJobRadius] = useState(300);

    const handlePinSubmit = () => {
        const ok = checkSupervisorPin(pin);
        if (!ok) { setPinError(true); setPin(''); }
    };

    const getJobName = (jId: string) => jobs.find((j: Job) => j.id === jId)?.name || 'Unknown';
    const getJobColor = (jId: string) => jobs.find((j: Job) => j.id === jId)?.color || '#888';
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

    const startJobEdit = (j: Job) => {
        setEditingJobId(j.id);
        setEditJobAddress(j.address);
        setEditJobLat(j.lat);
        setEditJobLng(j.lng);
        setEditJobRadius(j.radius);
    };

    const saveJobEdit = () => {
        if (editingJobId) {
            updateJob(editingJobId, {
                address: editJobAddress,
                lat: Number(editJobLat),
                lng: Number(editJobLng),
                radius: Number(editJobRadius),
            });
            setEditingJobId(null);
        }
    };

    const handleAddJobSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newJobName.trim()) return;
        addJob({
            name: newJobName,
            address: newJobAddress || 'Custom Location',
            color: newJobColor,
            lat: Number(newJobLat),
            lng: Number(newJobLng),
            radius: Number(newJobRadius),
        });
        setNewJobName('');
        setNewJobAddress('');
        setShowAddJobModal(false);
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
                    <p className="page-header-date">Supervisor Access Required</p>
                </div>
                <div className="supervisor-pin-card">
                    <h3>Supervisor Authorization</h3>
                    <p className="pin-desc">Enter PIN <code>1234</code> to access supervisor controls and job settings.</p>
                    <div className="pin-row">
                        <input
                            type="password"
                            className={`pin-input ${pinError ? 'error' : ''}`}
                            placeholder="Enter PIN (1234)"
                            value={pin}
                            maxLength={6}
                            onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                        />
                        <button className="btn-dark" onClick={handlePinSubmit}>Unlock Dashboard</button>
                    </div>
                    {pinError && <p className="pin-error">Incorrect PIN. Please try again with 1234.</p>}
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
                <button className="btn-ghost-sm" onClick={lockSupervisor}>Lock / Exit Mode</button>
            </div>

            {/* Stats row */}
            <div className="supervisor-stats">
                <div className="stat-card">
                    <p className="stat-label">Total Jobs</p>
                    <p className="stat-value">{jobs.length}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Pending Review</p>
                    <p className="stat-value flagged">{flagged.length}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Approved Hours</p>
                    <p className="stat-value">{hoursDecimal(approvedHours)} h</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Total Hours</p>
                    <p className="stat-value">{hoursDecimal(totalHours)} h</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="sup-tabs">
                <button className={`sup-tab ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>
                    Jobs & Geofences ({jobs.length})
                </button>
                <button className={`sup-tab ${activeTab === 'flagged' ? 'active' : ''}`} onClick={() => setActiveTab('flagged')}>
                    Pending ({flagged.length})
                </button>
                <button className={`sup-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
                    All Time Entries ({allEntries.length})
                </button>
            </div>

            {/* Entries & Jobs */}
            <div className="sup-entries">
                {activeTab === 'jobs' && (
                    <div className="jobs-header-actions">
                        <p className="jobs-section-desc">
                            Supervisor Controls: View 4 dummy jobs, edit location coordinates & geofence radius, or delete jobs.
                        </p>
                        <div className="jobs-btn-group">
                            <button className="btn-dark-sm" onClick={() => setShowAddJobModal(true)}>
                                + Add New Job
                            </button>
                            <button className="btn-ghost-sm" onClick={resetDummyJobs}>
                                ↺ Reset 4 Dummy Jobs
                            </button>
                        </div>
                    </div>
                )}

                {/* Add Job Modal */}
                {showAddJobModal && (
                    <div className="job-add-card">
                        <h4>Create New Job Location</h4>
                        <form onSubmit={handleAddJobSubmit} className="edit-form">
                            <div className="edit-row">
                                <label>Job Name</label>
                                <input type="text" className="edit-input" required placeholder="e.g. Metro Plaza Remodel" value={newJobName} onChange={e => setNewJobName(e.target.value)} />
                            </div>
                            <div className="edit-row">
                                <label>Badge Color</label>
                                <input type="color" className="edit-input" style={{ height: '38px', padding: '2px 6px', cursor: 'pointer' }} value={newJobColor} onChange={e => setNewJobColor(e.target.value)} />
                            </div>
                            <div className="edit-row">
                                <label>Address</label>
                                <input type="text" className="edit-input" placeholder="e.g. 500 Market St" value={newJobAddress} onChange={e => setNewJobAddress(e.target.value)} />
                            </div>
                            <div className="edit-row">
                                <label>Geofence Radius (m)</label>
                                <input type="number" className="edit-input" value={newJobRadius} onChange={e => setNewJobRadius(Number(e.target.value))} />
                            </div>
                            <div className="edit-row">
                                <label>Latitude</label>
                                <input type="number" step="0.000001" className="edit-input" value={newJobLat} onChange={e => setNewJobLat(Number(e.target.value))} />
                            </div>
                            <div className="edit-row">
                                <label>Longitude</label>
                                <input type="number" step="0.000001" className="edit-input" value={newJobLng} onChange={e => setNewJobLng(Number(e.target.value))} />
                            </div>
                            <div className="edit-actions">
                                <button type="submit" className="btn-dark-sm">Save Job</button>
                                <button type="button" className="btn-ghost-sm" onClick={() => setShowAddJobModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab !== 'jobs' && shown.length === 0 && (
                    <div className="sup-empty">
                        <span>{activeTab === 'flagged' ? 'No entries need review!' : 'No entries yet.'}</span>
                    </div>
                )}

                {/* Time Entries view */}
                {activeTab !== 'jobs' && shown.map((e: any) => (
                    <div key={e.id} className={`sup-entry-card ${e.locationFlag ? 'flagged-card' : ''} ${e.supervisorStatus === 'rejected' ? 'rejected-card' : ''}`}>
                        {e.locationFlag && (
                            <div className="flag-banner">
                                {e.locationFlag === 'gps_denied'
                                    ? 'GPS was off when clocked in — location unverified'
                                    : 'Clocked in outside the job site geofence'
                                }
                            </div>
                        )}

                        <div className="sup-entry-main">
                            <div className="sup-entry-left">
                                <span className="job-dot" style={{ backgroundColor: getJobColor(e.jobId) }} />
                                <div>
                                    <strong>{getJobName(e.jobId)}</strong>
                                    <p className="sup-entry-meta">
                                        {formatDate(e.start)} · {getTaskName(e.taskId)} · {formatTime(e.start)} – {e.end ? formatTime(e.end) : 'In progress'}
                                        {e.workType === 'field' && <span className="field-tag-small">Field</span>}
                                    </p>
                                    {e.notes && <p className="sup-entry-note">"{e.notes}"</p>}
                                </div>
                            </div>
                            <div className="sup-entry-right">
                                <span className="sup-hours">{e.end ? hoursDecimal(diffMs(e.start, e.end)) : '—'} h</span>
                                <span className={`sup-status-badge ${e.supervisorStatus}`}>{e.supervisorStatus}</span>
                            </div>
                        </div>

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
                                    <button className="sup-btn approve" onClick={() => approveEntry(e.id)}>Approve</button>
                                    <button className="sup-btn reject" onClick={() => rejectEntry(e.id)}>Reject</button>
                                </>}
                                {e.supervisorStatus !== 'pending' && (
                                    <button className="sup-btn neutral" onClick={() => approveEntry(e.id)}>Re-approve</button>
                                )}
                                <button className="sup-btn edit" onClick={() => startEdit(e)}>Edit time</button>
                            </div>
                        )}
                    </div>
                ))}
                
                {/* Jobs Management View (Supervisor only) */}
                {activeTab === 'jobs' && jobs.length === 0 && (
                    <div className="sup-empty">
                        <span>No jobs found. Click "Reset 4 Dummy Jobs" above to restore standard jobs.</span>
                    </div>
                )}

                {activeTab === 'jobs' && jobs.map((j: Job) => (
                    <div key={j.id} className="sup-entry-card job-card-item">
                        <div className="sup-entry-main">
                            <div className="sup-entry-left">
                                <span className="job-dot" style={{ backgroundColor: j.color }} />
                                <div>
                                    <div className="job-title-badge">
                                        <strong>{j.name}</strong>
                                        <span className="job-id-tag">ID: {j.id}</span>
                                    </div>
                                    <p className="sup-entry-meta">📍 Address: {j.address}</p>
                                    <p className="sup-entry-note">
                                        🎯 Geofence Radius: <strong>{j.radius}m</strong> | Lat: <code>{j.lat}</code> | Lng: <code>{j.lng}</code>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {editingJobId === j.id ? (
                            <div className="edit-form">
                                <div className="edit-row">
                                    <label>Address</label>
                                    <input type="text" className="edit-input" value={editJobAddress} onChange={ev => setEditJobAddress(ev.target.value)} />
                                </div>
                                <div className="edit-row">
                                    <label>Geofence Radius (meters)</label>
                                    <input type="number" className="edit-input" value={editJobRadius} onChange={ev => setEditJobRadius(Number(ev.target.value))} />
                                </div>
                                <div className="edit-row">
                                    <label>Latitude</label>
                                    <input type="number" step="0.000001" className="edit-input" value={editJobLat} onChange={ev => setEditJobLat(Number(ev.target.value))} />
                                </div>
                                <div className="edit-row">
                                    <label>Longitude</label>
                                    <input type="number" step="0.000001" className="edit-input" value={editJobLng} onChange={ev => setEditJobLng(Number(ev.target.value))} />
                                </div>
                                <div className="edit-actions">
                                    <button className="btn-dark-sm" onClick={saveJobEdit}>Save Location & Radius</button>
                                    <button className="btn-ghost-sm" onClick={() => setEditingJobId(null)}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="sup-entry-actions">
                                <button className="sup-btn edit" onClick={() => startJobEdit(j)}>
                                    ✏️ Edit Location & Radius
                                </button>
                                <button className="sup-btn delete" onClick={() => deleteJob(j.id)}>
                                    🗑️ Delete Job
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
