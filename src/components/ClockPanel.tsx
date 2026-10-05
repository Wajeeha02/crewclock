// src/components/ClockPanel.tsx
import { useState, useEffect } from 'react';
import type { Job, UserProfile, TimeEntry, WorkType } from '../types';
import { diffMs, formatHMS, hoursDecimal } from '../utils/time';
import { getCurrentPosition, haversineDistance } from '../hooks/useTimeEntries';
import FieldRouteTracker from './FieldRouteTracker';
import MapPicker from './MapPicker';

interface ClockPanelProps {
    currentUser: UserProfile;
    users: UserProfile[];
    jobs: Job[];
    activeEntry: TimeEntry | null;
    lastJobEntry: TimeEntry | null;
    clockIn: (targetUserId: string, jobId: string, segment: string, workType: WorkType, lat: number | null, lng: number | null, locationFlag: any) => void;
    clockOut: (targetUserId?: string, notes?: string) => void;
    switchActiveUser: (userId: string) => void;
    onUpdateJob: (id: string, updates: Partial<Job>) => void;
}

export default function ClockPanel({
    currentUser,
    users,
    jobs,
    activeEntry,
    lastJobEntry,
    clockIn,
    clockOut,
    switchActiveUser,
    onUpdateJob,
}: ClockPanelProps) {
    // 3-Click Kiosk Flow State: User -> Place/Job & Segment -> Clock In
    const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
    const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || 'j1');
    const [selectedSegment, setSelectedSegment] = useState<string>(jobs[0]?.segments[0]?.name || 'General Work');
    const [workType, setWorkType] = useState<WorkType>('onsite');

    // GPS flow states
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'checking' | 'blocked'>('idle');
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [distanceFromSite, setDistanceFromSite] = useState<number | null>(null);

    // Shift Wrap up modal
    const [showWrapUpModal, setShowWrapUpModal] = useState(false);
    const [shiftNotes, setShiftNotes] = useState('');

    const [editingJob, setEditingJob] = useState<Job | null>(null);

    const [, tick] = useState(0);

    // Keep active timer updating live
    useEffect(() => {
        if (!activeEntry || activeEntry.jobId === 'break') return;
        const t = setInterval(() => tick((n) => n + 1), 1000);
        return () => clearInterval(t);
    }, [activeEntry]);

    // When selected user changes, auto-select their assigned job if available (Job Dispatch pre-fill)
    useEffect(() => {
        const userAssignedJob = jobs.find(j => j.assignedCrewIds.includes(selectedUserId));
        if (userAssignedJob) {
            setSelectedJobId(userAssignedJob.id);
            if (userAssignedJob.segments.length > 0) {
                setSelectedSegment(userAssignedJob.segments[0].name);
            }
        }
    }, [selectedUserId, jobs]);

    // Update segment list when job changes
    const currentSelectedJob = jobs.find(j => j.id === selectedJobId) || jobs[0];
    useEffect(() => {
        if (currentSelectedJob && currentSelectedJob.segments.length > 0) {
            setSelectedSegment(currentSelectedJob.segments[0].name);
        }
    }, [selectedJobId]);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    const selectedWorker = users.find(u => u.id === selectedUserId) || currentUser;

    // ─── CLOCK IN WITH MANDATORY GPS VERIFICATION ───────────────────────────
    const handleClockInClick = async () => {
        setGpsStatus('checking');
        setGpsError(null);

        let lat: number | null = null;
        let lng: number | null = null;
        let locationFlag: any = null;

        try {
            const pos = await getCurrentPosition();
            lat = pos.lat;
            lng = pos.lng;

            if (currentSelectedJob) {
                const dist = haversineDistance(lat, lng, currentSelectedJob.lat, currentSelectedJob.lng);
                setDistanceFromSite(dist);

                if (workType === 'onsite' && dist > currentSelectedJob.radius) {
                    // BLOCKED — outside geofence radius as requested in requirement #1
                    setGpsStatus('blocked');
                    return;
                }

                if (workType === 'field' && dist > currentSelectedJob.radius) {
                    // Field mode allows clock in but flags outside radius
                    locationFlag = 'outside_radius';
                }
            }
        } catch {
            // GPS off or denied -> BLOCKED as required ("clock-in is blocked if location is off or user outside radius")
            setGpsStatus('blocked');
            setGpsError('gps_denied');
            return;
        }

        setGpsStatus('idle');
        clockIn(selectedUserId, selectedJobId, selectedSegment, workType, lat, lng, locationFlag);
    };

    const handleStartBreak = () => {
        clockOut(selectedUserId);
        clockIn(selectedUserId, 'break', 'Rest Break', 'onsite', null, null, null);
    };

    const handleEndBreak = () => {
        clockOut(selectedUserId);
        if (lastJobEntry) {
            clockIn(selectedUserId, lastJobEntry.jobId, lastJobEntry.segment, lastJobEntry.workType, null, null, null);
        } else {
            clockIn(selectedUserId, selectedJobId, selectedSegment, workType, null, null, null);
        }
    };

    const confirmClockOut = () => {
        clockOut(selectedUserId, shiftNotes);
        setShowWrapUpModal(false);
        setShiftNotes('');
    };

    // ─── ACTIVE CLOCKED-IN VIEW ──────────────────────────────────────────────
    if (activeEntry && activeEntry.userId === selectedUserId) {
        const isBreak = activeEntry.jobId === 'break';
        const currentJob = jobs.find(j => j.id === (isBreak ? lastJobEntry?.jobId : activeEntry.jobId)) || currentSelectedJob;
        const timerMs = isBreak && lastJobEntry ? diffMs(lastJobEntry.start, lastJobEntry.end ?? undefined) : diffMs(activeEntry.start);
        const isField = (isBreak ? lastJobEntry?.workType : activeEntry.workType) === 'field';

        return (
            <div className="clock-page">
                <div className="page-header">
                    <div>
                        <span className="section-eyebrow">SHARED ONSITE & FIELD DEVICE KIOSK</span>
                        <p className="page-header-date">{today}</p>
                    </div>
                    <span className={`status-badge ${isBreak ? 'on-break' : isField ? 'field-mode' : 'clocked-in'}`}>
                        ● {isBreak ? 'On Rest Break' : isField ? 'Field Mode — Active Route Tracking' : 'On-Site — Shift Active'}
                    </span>
                </div>

                {/* Worker Selector Bar */}
                <div className="worker-selector-bar">
                    <span className="bar-label">Current Active Device Worker:</span>
                    <select
                        className="worker-select-dropdown"
                        value={selectedUserId}
                        onChange={(e) => {
                            setSelectedUserId(e.target.value);
                            switchActiveUser(e.target.value);
                        }}
                    >
                        {users.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.name} ({u.title}) — {u.role.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="active-timer-card">
                    <div className="active-timer-top">
                        <span className="active-job-label">{isBreak ? '⏸ Rest Break' : currentJob?.name}</span>
                        <span className="active-task-label">{isBreak ? 'Break Time' : activeEntry.segment}</span>
                        {isField && !isBreak && <span className="active-task-label field-tag">Field Mode</span>}
                    </div>

                    <div className="active-timer-display">
                        {isBreak ? <span className="paused-label">⏸ Paused</span> : formatHMS(timerMs)}
                    </div>

                    <p className="active-timer-sub">
                        Clocked in at {new Date(activeEntry.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {currentJob?.address ? ` · ${currentJob.address}` : ''}
                    </p>

                    <div className="active-timer-actions">
                        <button className="btn-dark btn-clock-out" onClick={() => setShowWrapUpModal(true)}>
                            ↗ Clock Out Shift
                        </button>
                        {isBreak ? (
                            <button className="btn-outline-dark" onClick={handleEndBreak}>
                                End Break & Resume Shift
                            </button>
                        ) : (
                            <button className="btn-outline-dark" onClick={handleStartBreak}>
                                Start Break
                            </button>
                        )}
                    </div>
                </div>

                {/* Field Mode Route Tracker */}
                {isField && !isBreak && (
                    <FieldRouteTracker
                        routePoints={activeEntry.gpsRoute || []}
                        jobName={currentJob?.name || 'Field Route'}
                        isLive={true}
                    />
                )}

                {/* Wrap up modal */}
                {showWrapUpModal && (
                    <div className="modal-overlay">
                        <div className="modal-sheet">
                            <h3>Shift Wrap-Up & Notes</h3>
                            <p className="modal-sub">
                                {selectedWorker.name} · {currentJob?.name} · {hoursDecimal(timerMs)} hours worked
                            </p>
                            <input
                                className="notes-field"
                                placeholder="Add shift wrap-up notes for supervisor review..."
                                value={shiftNotes}
                                onChange={(e) => setShiftNotes(e.target.value)}
                            />
                            <div className="modal-btns">
                                <button className="btn-dark" onClick={confirmClockOut}>
                                    Clock Out & Save Entry
                                </button>
                                <button className="btn-ghost" onClick={() => setShowWrapUpModal(false)}>
                                    Keep Working
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── READY TO CLOCK IN (3-CLICK FLOW) ───────────────────────────────────
    return (
        <div className="clock-page">
            <div className="page-header">
                <div>
                    <span className="section-eyebrow">SHARED ONSITE & FIELD DEVICE KIOSK</span>
                    <p className="page-header-date">{today}</p>
                </div>
                <span className="status-badge not-clocked-in">● Not Clocked In</span>
            </div>

            {/* Target 3-Click Indicator Header */}
            <div className="three-click-indicator">
                <div className={`step-item ${selectedUserId ? 'active' : ''}`}>
                    <span className="step-num">1</span>
                    <span className="step-text">Select User</span>
                </div>
                <div className="step-arrow">→</div>
                <div className={`step-item ${selectedJobId ? 'active' : ''}`}>
                    <span className="step-num">2</span>
                    <span className="step-text">Select Place / Segment</span>
                </div>
                <div className="step-arrow">→</div>
                <div className="step-item active-green">
                    <span className="step-num">3</span>
                    <span className="step-text">Clock In</span>
                </div>
            </div>

            {/* STEP 1: Select User */}
            <div className="section-block">
                <div className="section-row-header">
                    <span className="section-label">Step 1: Select Employee / Device User</span>
                </div>
                <div className="user-kiosk-chips">
                    {users
                        .filter(u => u.role !== 'contractor') // contractors use contractor portal
                        .map(u => (
                            <button
                                key={u.id}
                                className={`user-chip ${selectedUserId === u.id ? 'selected' : ''}`}
                                onClick={() => {
                                    setSelectedUserId(u.id);
                                    switchActiveUser(u.id);
                                }}
                            >
                                <span className="chip-avatar">{u.avatar}</span>
                                <div className="chip-info">
                                    <strong>{u.name}</strong>
                                    <small>{u.title}</small>
                                </div>
                                {selectedUserId === u.id && <span className="chip-check">✓</span>}
                            </button>
                        ))}
                </div>
            </div>

            {/* Work Mode Toggle */}
            <div className="section-block">
                <div className="section-row-header">
                    <span className="section-label">Work Mode</span>
                </div>
                <div className="work-type-toggle">
                    <button
                        className={`work-type-btn ${workType === 'onsite' ? 'active' : ''}`}
                        onClick={() => setWorkType('onsite')}
                    >
                        On-Site Kiosk (Shared Device)
                    </button>
                    <button
                        className={`work-type-btn ${workType === 'field' ? 'active' : ''}`}
                        onClick={() => setWorkType('field')}
                    >
                        Field Mode (Full GPS Route Tracking)
                    </button>
                </div>
                {workType === 'onsite' && (
                    <p className="geofence-hint">
                        Onsite mode verifies GPS against job site geofence radius ({currentSelectedJob?.radius}m). Clock-in is blocked if outside.
                    </p>
                )}
                {workType === 'field' && (
                    <p className="field-notice">
                        Field mode tracks full GPS travel route & breadcrumbs while crews work on location.
                    </p>
                )}
            </div>

            {/* STEP 2: Select Job Place & Segment */}
            <div className="section-block">
                <div className="section-row-header">
                    <span className="section-label">Step 2: Select Dispatched Job Place & Segment</span>
                    {currentSelectedJob?.assignedCrewIds.includes(selectedUserId) && (
                        <span className="dispatch-autofill-badge">⚡ Auto-Filled from Job Dispatch</span>
                    )}
                </div>

                <div className="job-grid">
                    {jobs.map((j) => (
                        <div
                            key={j.id}
                            className={`job-tile ${selectedJobId === j.id ? 'selected' : ''}`}
                            onClick={() => setSelectedJobId(j.id)}
                        >
                            <div className="job-tile-header">
                                <span className="job-tile-label" style={{ color: j.color }}>
                                    {j.code}
                                </span>
                                {currentUser.role === 'super_admin' && (
                                    <button
                                        type="button"
                                        className="btn-ghost-sm"
                                        style={{ marginLeft: 'auto', marginRight: '8px', padding: '2px 6px' }}
                                        onClick={(e) => { e.stopPropagation(); setEditingJob(j); }}
                                    >
                                        ✏️
                                    </button>
                                )}
                                {selectedJobId === j.id && <span className="job-tile-check">✓</span>}
                            </div>
                            <p className="job-tile-name">{j.name}</p>
                            <p className="job-tile-address"> {j.address}</p>
                            <p className="job-tile-radius"> {j.radius}m Geofence Radius</p>
                        </div>
                    ))}
                </div>

                {/* Job Segments / Cost Codes */}
                {currentSelectedJob && currentSelectedJob.segments.length > 0 && (
                    <div className="segment-pills-row" style={{ marginTop: '16px' }}>
                        <span className="segment-label-sm">Select Segment Code:</span>
                        <div className="task-pills">
                            {currentSelectedJob.segments.map((seg) => (
                                <button
                                    key={seg.id}
                                    className={`task-chip ${selectedSegment === seg.name ? 'selected' : ''}`}
                                    onClick={() => setSelectedSegment(seg.name)}
                                >
                                    <code>{seg.code}</code> {seg.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* STEP 3: Clock In Button */}
            <div className="section-block">
                <button className="btn-dark btn-clock-in" onClick={handleClockInClick}>
                    ↗ Step 3: Clock In {selectedWorker.name} at {currentSelectedJob?.name}
                </button>
            </div>

            {/* GPS Checking / Blocked Modals */}
            {gpsStatus === 'checking' && (
                <div className="modal-overlay">
                    <div className="modal-sheet center-sheet">
                        <div className="spinner" />
                        <p className="checking-text">Verifying device GPS position against geofence ({currentSelectedJob?.radius}m)...</p>
                    </div>
                </div>
            )}

            {gpsStatus === 'blocked' && (
                <div className="modal-overlay">
                    <div className="modal-sheet">
                        <h3> Clock-In Blocked by Location Policy</h3>
                        {gpsError === 'gps_denied' ? (
                            <>
                                <p className="modal-sub">
                                    GPS access was denied or disabled on this device. Location verification is mandatory to clock in.
                                </p>
                                <p className="modal-sub hint">
                                    Enable device location / browser GPS permission and try again.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="modal-sub">
                                    You are currently <strong>{distanceFromSite ? Math.round(distanceFromSite) : '?'} meters</strong> away from <strong>{currentSelectedJob?.name}</strong>.
                                </p>
                                <p className="modal-sub">
                                    The configured geofence radius is <strong>{currentSelectedJob?.radius} meters</strong>. On-Site mode blocks clock-ins outside the geofence boundary.
                                </p>
                                <p className="modal-sub hint">
                                    Move within site bounds or switch to Field Mode if traveling.
                                </p>
                            </>
                        )}
                        <div className="modal-btns">
                            <button className="btn-dark" onClick={() => setGpsStatus('idle')}>
                                Understood & Return
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingJob && (
                <div className="modal-overlay">
                    <div className="modal-sheet">
                        <h3>Edit Job: {editingJob.name}</h3>
                        <div className="edit-form-grid">
                            <div className="edit-row">
                                <label>Job Name</label>
                                <input
                                    type="text"
                                    className="edit-input"
                                    value={editingJob.name}
                                    onChange={(e) => setEditingJob({ ...editingJob, name: e.target.value })}
                                />
                            </div>
                            <div className="edit-row">
                                <label>Address</label>
                                <input
                                    type="text"
                                    className="edit-input"
                                    value={editingJob.address}
                                    onChange={(e) => setEditingJob({ ...editingJob, address: e.target.value })}
                                />
                            </div>
                            <div className="edit-row">
                                <label>Geofence Radius ({editingJob.radius} meters)</label>
                                <input
                                    type="range"
                                    min="50"
                                    max="1000"
                                    step="25"
                                    value={editingJob.radius}
                                    onChange={(e) => setEditingJob({ ...editingJob, radius: Number(e.target.value) })}
                                />
                            </div>
                            <div className="edit-row">
                                <label>Location Map</label>
                                <MapPicker
                                    lat={editingJob.lat}
                                    lng={editingJob.lng}
                                    radius={editingJob.radius}
                                    height="240px"
                                    onLocationSelect={(lat, lng) => setEditingJob({ ...editingJob, lat, lng })}
                                />
                            </div>
                        </div>
                        <div className="modal-btns">
                            <button className="btn-dark" onClick={() => {
                                onUpdateJob(editingJob.id, {
                                    name: editingJob.name,
                                    address: editingJob.address,
                                    radius: editingJob.radius,
                                    lat: editingJob.lat,
                                    lng: editingJob.lng,
                                });
                                setEditingJob(null);
                            }}>
                                Save Changes
                            </button>
                            <button className="btn-ghost" onClick={() => setEditingJob(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}