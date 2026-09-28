// components/ClockPanel.tsx — On-Site & Field clock-in with GPS geofencing
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TASKS } from '../data/jobs';
import type { Job } from '../data/jobs';
import { diffMs, formatHMS, hoursDecimal } from '../utils/time';
import { getCurrentPosition, haversineDistance } from '../hooks/useTimeEntries';
import type { TimeEntry } from '../hooks/useTimeEntries';

type WorkType = 'onsite' | 'field';

export default function ClockPanel({ entries, active, lastJob, clockIn, clockOut, jobs = [] }: any) {
    const navigate = useNavigate();
    const [jobId, setJobId] = useState(jobs[0]?.id || 'j1');
    const [taskId] = useState(TASKS[0].id);
    const [workType, setWorkType] = useState<WorkType>('onsite');
    const [, tick] = useState(0);

    // Modal states
    const [showWrapUpModal, setShowWrapUpModal] = useState(false);
    const [notes, setNotes] = useState('');

    // GPS / clock-in flow states
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'checking' | 'blocked' | 'travel_confirm'>('idle');
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [distanceFromSite, setDistanceFromSite] = useState<number | null>(null);

    useEffect(() => {
        if (!active || active.jobId === 'break') return;
        const t = setInterval(() => tick((n) => n + 1), 1000);
        return () => clearInterval(t);
    }, [active]);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const recentEntries = entries.filter((e: any) => e.end && e.jobId !== 'break').slice(0, 3);

    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const getJobName = (jId: string) => jobs.find((j: Job) => j.id === jId)?.name || 'Unknown';
    const getTaskName = (tId: string) => TASKS.find((t) => t.id === tId)?.name || 'Task';

    // ─── Clock-in flow with GPS ───────────────────────────────────────────────
    const handleClockInClick = async () => {
        if (workType === 'field') {
            // Field mode: GPS is mandatory
            await attemptClockIn('field');
        } else {
            // On-site: GPS check enforced, blocked if outside radius
            await attemptClockIn('onsite');
        }
    };

    const attemptClockIn = async (type: WorkType) => {
        setGpsStatus('checking');
        setGpsError(null);

        let lat: number | null = null;
        let lng: number | null = null;
        let locationFlag: string | null = null;

        try {
            const pos = await getCurrentPosition();
            lat = pos.lat;
            lng = pos.lng;

            const job = jobs.find((j: Job) => j.id === jobId);
            if (job) {
                const dist = haversineDistance(lat, lng, job.lat, job.lng);
                setDistanceFromSite(dist);

                if (type === 'onsite' && dist > job.radius) {
                    // BLOCKED — outside geofence
                    setGpsStatus('blocked');
                    return;
                }
                if (type === 'field') {
                    // Field mode: flagged but allowed
                    locationFlag = dist > job.radius ? 'outside_radius' : null;
                }
            }
        } catch {
            if (type === 'onsite') {
                // On-site: GPS denied → blocked
                setGpsStatus('blocked');
                setGpsError('gps_denied');
                return;
            }
            // Field: GPS denied → block as well (GPS mandatory)
            setGpsStatus('blocked');
            setGpsError('gps_denied');
            return;
        }

        setGpsStatus('idle');
        clockIn(jobId, taskId, type, lat, lng, locationFlag);
    };

    const handleStartBreak = () => { clockOut(); clockIn('break', null, 'onsite', null, null, null); };
    const handleEndBreak = () => { clockOut(); if (lastJob) clockIn(lastJob.jobId, lastJob.taskId, lastJob.workType, null, null, null); };
    const handleClockOutClick = () => setShowWrapUpModal(true);
    const confirmClockOut = () => { clockOut(notes); setShowWrapUpModal(false); setNotes(''); navigate('/timesheets'); };

    // ─── CLOCKED IN view ────────────────────────────────────────────────────
    if (active) {
        const isBreak = active.jobId === 'break';
        const currentJob = jobs.find((j: Job) => j.id === (isBreak ? lastJob?.jobId : active.jobId));
        const currentTask = TASKS.find((t) => t.id === (isBreak ? lastJob?.taskId : active.taskId));
        const timerMs = isBreak && lastJob ? diffMs(lastJob.start, lastJob.end) : diffMs(active.start);
        const isField = (isBreak ? lastJob?.workType : active.workType) === 'field';

        return (
            <div className="clock-page">
                <div className="page-header">
                    <p className="page-header-date">{today}</p>
                    <span className={`status-badge ${isField ? 'field-mode' : 'clocked-in'}`}>
                        ● {isBreak ? 'On Break' : isField ? 'Field — Clocked in' : 'On-Site — Clocked in'}
                    </span>
                </div>

                <div className="active-timer-card">
                    <div className="active-timer-top">
                        <span className="active-job-label">{currentJob?.name}</span>
                        <span className="active-task-label">{isBreak ? 'Break' : currentTask?.name}</span>
                        {isField && !isBreak && <span className="active-task-label field-tag">Field</span>}
                    </div>
                    <div className="active-timer-display">
                        {isBreak ? <span className="paused-label">⏸ Paused</span> : formatHMS(timerMs)}
                    </div>
                    {!isBreak && <p className="active-timer-sub">
                        Started {new Date(active.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </p>}
                    {isBreak && <p className="active-timer-sub">On break — timer paused at {formatHMS(timerMs)}</p>}

                    <div className="active-timer-actions">
                        <button className="btn-dark btn-clock-out" onClick={handleClockOutClick}>↗ Clock out</button>
                        {isBreak
                            ? <button className="btn-outline-dark" onClick={handleEndBreak}>End break</button>
                            : <button className="btn-outline-dark" onClick={handleStartBreak}>Start break</button>
                        }
                    </div>
                </div>

                {recentEntries.length > 0 && (
                    <div className="section-block">
                        <div className="section-row-header">
                            <span className="section-label">Recent activity</span>
                            <button className="view-all-btn" onClick={() => navigate('/timesheets')}>View all sheets ↗</button>
                        </div>
                        <EntryList entries={recentEntries} getJobName={getJobName} getTaskName={getTaskName} formatTime={formatTime} />
                    </div>
                )}

                {showWrapUpModal && (
                    <div className="modal-overlay">
                        <div className="modal-sheet">
                            <h3>Shift wrap-up</h3>
                            <p className="modal-sub">{currentJob?.name} · {currentTask?.name} · {formatHMS(timerMs)} worked</p>
                            <input className="notes-field" placeholder="Add a note for your supervisor" value={notes} onChange={(e) => setNotes(e.target.value)} />
                            <div className="modal-btns">
                                <button className="btn-dark" onClick={confirmClockOut}>Clock out and save</button>
                                <button className="btn-ghost" onClick={() => setShowWrapUpModal(false)}>Keep working</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const selectedJob = jobs.find((j: Job) => j.id === jobId);

    // ─── GPS BLOCKED modal ──────────────────────────────────────────────────
    const blockedModal = gpsStatus === 'blocked' && (
        <div className="modal-overlay">
            <div className="modal-sheet">
                <h3>Cannot clock in</h3>
                {gpsError === 'gps_denied' ? (
                    <>
                        <p className="modal-sub">GPS access was denied. Location verification is required to clock in at a job site.</p>
                        <p className="modal-sub hint">Go to your browser settings → allow location access for this site, then try again.</p>
                    </>
                ) : (
                    <>
                        <p className="modal-sub">
                            You are <strong>{distanceFromSite ? Math.round(distanceFromSite) : '?'}m</strong> away from <strong>{selectedJob?.name}</strong>.
                        </p>
                        <p className="modal-sub">The allowed radius is <strong>{selectedJob?.radius}m</strong>. You must be on-site to clock in.</p>
                        <p className="modal-sub hint">If you believe this is an error, contact your supervisor.</p>
                    </>
                )}
                <div className="modal-btns">
                    <button className="btn-dark" onClick={() => { setGpsStatus('idle'); setGpsError(null); }}>Got it</button>
                </div>
            </div>
        </div>
    );

    // ─── GPS CHECKING overlay ───────────────────────────────────────────────
    const checkingOverlay = gpsStatus === 'checking' && (
        <div className="modal-overlay">
            <div className="modal-sheet center-sheet">
                <div className="spinner" />
                <p className="checking-text">Verifying your location…</p>
            </div>
        </div>
    );

    // ─── READY TO CLOCK IN view ─────────────────────────────────────────────
    return (
        <div className="clock-page">
            <div className="page-header">
                <p className="page-header-date">{today}</p>
                <span className="status-badge not-clocked-in">● Not clocked in</span>
            </div>

            {/* Work Type Toggle */}
            <div className="section-block">
                <div className="section-row-header">
                    <span className="section-label">Work location</span>
                </div>
                <div className="work-type-toggle">
                    <button className={`work-type-btn ${workType === 'onsite' ? 'active' : ''}`} onClick={() => setWorkType('onsite')}>
                        On-Site
                    </button>
                    <button className={`work-type-btn ${workType === 'field' ? 'active' : ''}`} onClick={() => setWorkType('field')}>
                        Field / Travel
                    </button>
                </div>
                {workType === 'field' && (
                    <div className="field-notice">
                        <span>Field mode tracks your GPS route. Location is <strong>mandatory</strong> and will be visible to your supervisor.</span>
                    </div>
                )}
            </div>

            {/* Project selection */}
            <div className="section-block">
                <div className="section-row-header">
                    <span className="section-label">Select current project</span>
                    <span className="section-count">01 / 0{jobs.length}</span>
                </div>
                <div className="job-grid">
                    {jobs.map((j: Job, idx: number) => (
                        <div key={j.id} className={`job-tile ${jobId === j.id ? 'selected' : ''}`} onClick={() => setJobId(j.id)}>
                            <div className="job-tile-header">
                                <span className="job-tile-label">{idx === jobs.length - 1 ? 'INTERNAL' : `JOB 0${idx + 1}`}</span>
                                {jobId === j.id && <span className="job-tile-check">✓</span>}
                            </div>
                            <p className="job-tile-name">{j.name}</p>
                            <p className="job-tile-address">{j.address}</p>
                            {workType === 'onsite' && <p className="job-tile-radius">{j.radius}m radius</p>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Task selection */}
            {/* <div className="section-block">
                <div className="section-row-header">
                    <span className="section-label">Current task code</span>
                    <span className="section-count">02 / 02</span>
                </div>
                <div className="task-pills">
                    {TASKS.map((t: { id: string; name: string }) => (
                        <button key={t.id} className={`task-chip ${taskId === t.id ? 'selected' : ''}`} onClick={() => setTaskId(t.id)}>
                            {t.name}
                        </button>
                    ))}
                </div>
            </div> */}

            {/* Clock in button */}
            <div className="section-block">
                <button className="btn-dark btn-clock-in" onClick={handleClockInClick}>
                    ↗ Clock in at {selectedJob?.name}
                </button>
                {workType === 'onsite' && (
                    <p className="geofence-hint">Location will be verified against the job site ({selectedJob?.radius}m radius)</p>
                )}
            </div>

            {/* Recent activity */}
            {recentEntries.length > 0 && (
                <div className="section-block">
                    <div className="section-row-header">
                        <span className="section-label">Recent activity</span>
                        <button className="view-all-btn" onClick={() => navigate('/timesheets')}>View all sheets ↗</button>
                    </div>
                    <EntryList entries={recentEntries} getJobName={getJobName} getTaskName={getTaskName} formatTime={formatTime} />
                </div>
            )}

            {checkingOverlay}
            {blockedModal}
        </div>
    );
}

// Shared entry list component
function EntryList({ entries, getJobName, getTaskName, formatTime }: { entries: TimeEntry[]; getJobName: (id: string) => string; getTaskName: (id: string) => string; formatTime: (iso: string) => string; }) {
    return (
        <div className="entries-list-flat">
            {entries.map((e: TimeEntry) => (
                <div className="entry-row" key={e.id}>
                    <div className="entry-row-today">TODAY</div>
                    <div className="entry-row-info">
                        <strong>{getJobName(e.jobId)}</strong>
                        <span>
                            {getTaskName(e.taskId ?? '')} · {formatTime(e.start)} – {formatTime(e.end ?? e.start)}
                            {e.workType === 'field' && <span className="entry-field-tag">Field</span>}
                        </span>
                    </div>
                    <div className="entry-row-right">
                        <span className="entry-hours-label">{hoursDecimal(diffMs(e.start, e.end ?? undefined))} h</span>
                        {e.locationFlag
                            ? <span className="flagged-label">⚠ Flagged</span>
                            : <span className="synced-label">Synced</span>
                        }
                    </div>
                </div>
            ))}
        </div>
    );
}