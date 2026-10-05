// src/components/JobDispatchPanel.tsx
import { useState } from 'react';
import type { Job, UserProfile, JobSegment } from '../types';
import MapPicker from './MapPicker';

interface JobDispatchPanelProps {
    jobs: Job[];
    users: UserProfile[];
    onAddJob: (job: Omit<Job, 'id'>) => void;
    onUpdateJob: (id: string, changes: Partial<Job>) => void;
    onDeleteJob: (id: string) => void;
    onResetJobs: () => void;
    canManageJobs: boolean;
}

export default function JobDispatchPanel({
    jobs,
    users,
    onAddJob,
    onUpdateJob,
    onDeleteJob,
    onResetJobs,
    canManageJobs,
}: JobDispatchPanelProps) {
    const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || 'j1');
    const [showAddModal, setShowAddModal] = useState(false);

    // New Job Form State
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState(37.7749);
    const [lng, setLng] = useState(-122.4194);
    const [radius, setRadius] = useState(300); // Default 300m geofence as in call demo
    const [color, setColor] = useState('#3B82F6');
    const [dispatchNotes, setDispatchNotes] = useState('');
    const [assignedCrewIds, setAssignedCrewIds] = useState<string[]>(['u4', 'u5']);
    const [segmentsInput, setSegmentsInput] = useState('01 - Site Setup, 02 - Core Work, 03 - Inspection');

    // Editing Job State
    const [isEditing, setIsEditing] = useState(false);
    const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

    const handleCreateJob = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const parsedSegments: JobSegment[] = segmentsInput.split(',').map((s, idx) => ({
            id: `seg_${Date.now()}_${idx}`,
            name: s.trim(),
            code: `COST-0${idx + 1}`,
        }));

        onAddJob({
            name,
            code: code || `JOB-${Math.floor(100 + Math.random() * 900)}`,
            address: address || 'Custom Dispatched Site',
            lat: Number(lat),
            lng: Number(lng),
            radius: Number(radius),
            color,
            assignedCrewIds,
            segments: parsedSegments.length > 0 ? parsedSegments : [{ id: 's1', name: 'General Work', code: 'GEN' }],
            dispatchNotes,
            status: 'active',
        });

        setShowAddModal(false);
        resetForm();
    };

    const resetForm = () => {
        setName('');
        setCode('');
        setAddress('');
        setLat(37.7749);
        setLng(-122.4194);
        setRadius(300);
        setDispatchNotes('');
    };

    const handleCrewToggle = (uId: string) => {
        if (assignedCrewIds.includes(uId)) {
            setAssignedCrewIds(assignedCrewIds.filter((id) => id !== uId));
        } else {
            setAssignedCrewIds([...assignedCrewIds, uId]);
        }
    };

    return (
        <div className="job-dispatch-page">
            <div className="page-header">
                <div>
                    <span className="section-eyebrow">JOB DISPATCH & GEOFENCING SYSTEM</span>
                    <h2>Location & Crew Dispatch Hub</h2>
                </div>
                {canManageJobs && (
                    <div className="btn-group">
                        <button className="btn-dark" onClick={() => setShowAddModal(true)}>
                            + Dispatch New Job Site
                        </button>
                        <button className="btn-ghost-sm" onClick={onResetJobs}>
                            ↺ Reset Standard Demo Jobs
                        </button>
                    </div>
                )}
            </div>

            <div className="dispatch-layout">
                {/* Left Column: Job Selector List */}
                <div className="dispatch-sidebar-list">
                    <span className="sidebar-section-title">Dispatched Job Sites ({jobs.length})</span>
                    <div className="job-cards-stack">
                        {jobs.map((j) => (
                            <div
                                key={j.id}
                                className={`dispatch-job-tile ${j.id === selectedJobId ? 'active' : ''}`}
                                onClick={() => setSelectedJobId(j.id)}
                            >
                                <div className="tile-top-row">
                                    <span className="color-dot" style={{ backgroundColor: j.color }} />
                                    <span className="job-code-pill">{j.code}</span>
                                    <span className="radius-pill">{j.radius}m Geofence</span>
                                </div>
                                <h4 className="job-name">{j.name}</h4>
                                <p className="job-address"> {j.address}</p>
                                <div className="crew-avatar-row">
                                    {j.assignedCrewIds.map((uId) => {
                                        const user = users.find((u) => u.id === uId);
                                        return (
                                            <span key={uId} className="mini-avatar" title={user?.name}>
                                                {user?.avatar || uId}
                                            </span>
                                        );
                                    })}
                                    <span className="crew-count-tag">
                                        {j.assignedCrewIds.length} crew assigned
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Selected Job Details & Interactive Map Picker */}
                {selectedJob && (
                    <div className="dispatch-detail-panel">
                        <div className="detail-header-card">
                            <div className="header-title-block">
                                <div className="title-row-flex">
                                    <span
                                        className="job-color-badge"
                                        style={{ backgroundColor: selectedJob.color }}
                                    />
                                    <h3>{selectedJob.name}</h3>
                                    <span className="status-badge-active">{selectedJob.status.toUpperCase()}</span>
                                </div>
                                <p className="detail-address"> {selectedJob.address}</p>
                            </div>

                            {canManageJobs && (
                                <div className="detail-actions">
                                    <button
                                        className="btn-outline-dark"
                                        onClick={() => setIsEditing(!isEditing)}
                                    >
                                        {isEditing ? 'Close Editor' : '✏️ Edit Location & Geofence'}
                                    </button>
                                    <button
                                        className="btn-danger-sm"
                                        onClick={() => onDeleteJob(selectedJob.id)}
                                    >
                                        🗑️ Delete Job
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Interactive Leaflet Map Picker */}
                        <div className="dispatch-map-container-card">
                            <h4 className="map-card-title">
                                🗺️ Geofence Boundary Map Picker ({selectedJob.radius}m radius)
                            </h4>
                            <MapPicker
                                lat={selectedJob.lat}
                                lng={selectedJob.lng}
                                radius={selectedJob.radius}
                                height="340px"
                                onLocationSelect={(newLat, newLng) => {
                                    if (canManageJobs) {
                                        onUpdateJob(selectedJob.id, { lat: newLat, lng: newLng });
                                    }
                                }}
                            />
                        </div>

                        {/* Editable Settings or Overview */}
                        {isEditing && canManageJobs ? (
                            <div className="job-editor-card">
                                <h4>Edit Job Site Settings</h4>
                                <div className="edit-form-grid">
                                    <div className="edit-row">
                                        <label>Address</label>
                                        <input
                                            type="text"
                                            className="edit-input"
                                            value={selectedJob.address}
                                            onChange={(e) =>
                                                onUpdateJob(selectedJob.id, { address: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="edit-row">
                                        <label>Geofence Radius ({selectedJob.radius} meters)</label>
                                        <input
                                            type="range"
                                            min="50"
                                            max="1000"
                                            step="25"
                                            value={selectedJob.radius}
                                            onChange={(e) =>
                                                onUpdateJob(selectedJob.id, {
                                                    radius: Number(e.target.value),
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="edit-row">
                                        <label>Dispatch Notes for Field Crews</label>
                                        <textarea
                                            className="justification-textarea"
                                            value={selectedJob.dispatchNotes || ''}
                                            onChange={(e) =>
                                                onUpdateJob(selectedJob.id, {
                                                    dispatchNotes: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="dispatch-info-grid">
                                <div className="info-card">
                                    <h5>Assigned Field Crew</h5>
                                    <p className="info-sub">
                                        When these employees select this project in Field or Onsite mode,
                                        their location and segments pre-fill automatically.
                                    </p>
                                    <div className="crew-members-list">
                                        {users
                                            .filter((u) => selectedJob.assignedCrewIds.includes(u.id))
                                            .map((u) => (
                                                <div key={u.id} className="crew-member-chip">
                                                    <span className="user-avatar-sm">{u.avatar}</span>
                                                    <div>
                                                        <strong>{u.name}</strong>
                                                        <small>{u.title}</small>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                <div className="info-card">
                                    <h5>Job Segments / Cost Codes</h5>
                                    <p className="info-sub">
                                        Supervisors can add cost codes for 3-click fast clock-in.
                                    </p>
                                    <div className="segments-tags-list">
                                        {selectedJob.segments.map((seg) => (
                                            <span key={seg.id} className="segment-tag">
                                                <code>{seg.code}</code> — {seg.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="info-card full-width">
                                    <h5>Dispatch Instructions for Crew</h5>
                                    <p className="dispatch-notes-quote">
                                        "{selectedJob.dispatchNotes || 'No specific dispatch notes.'}"
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Dispatch New Job */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-sheet add-job-modal">
                        <h3>Dispatch New Job Location</h3>
                        <p className="modal-sub">
                            Use the interactive map picker to set lat/lng and geofence radius.
                        </p>

                        <form onSubmit={handleCreateJob} className="edit-form">
                            <div className="edit-row">
                                <label>Job Site Name</label>
                                <input
                                    type="text"
                                    className="edit-input"
                                    placeholder="e.g. San Mateo Bridge Foundation"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="edit-row-flex">
                                <div className="edit-row">
                                    <label>Job Code</label>
                                    <input
                                        type="text"
                                        className="edit-input"
                                        placeholder="e.g. JOB-500"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                    />
                                </div>

                                <div className="edit-row">
                                    <label>Badge Color</label>
                                    <input
                                        type="color"
                                        className="edit-input color-picker"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="edit-row">
                                <label>Street Address</label>
                                <input
                                    type="text"
                                    className="edit-input"
                                    placeholder="e.g. 1200 Pacific Blvd"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                />
                            </div>

                            <div className="edit-row">
                                <label>Geofence Radius ({radius} meters)</label>
                                <input
                                    type="range"
                                    min="50"
                                    max="1000"
                                    step="25"
                                    value={radius}
                                    onChange={(e) => setRadius(Number(e.target.value))}
                                />
                            </div>

                            <div className="edit-row">
                                <label>Location Map Picker Pin</label>
                                <MapPicker
                                    lat={lat}
                                    lng={lng}
                                    radius={radius}
                                    height="240px"
                                    onLocationSelect={(selectedLat, selectedLng) => {
                                        setLat(selectedLat);
                                        setLng(selectedLng);
                                    }}
                                />
                            </div>

                            <div className="edit-row">
                                <label>Assign Crew Members</label>
                                <div className="crew-select-grid">
                                    {users
                                        .filter((u) => u.role === 'employee' || u.role === 'supervisor')
                                        .map((u) => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                className={`crew-select-chip ${assignedCrewIds.includes(u.id) ? 'selected' : ''
                                                    }`}
                                                onClick={() => handleCrewToggle(u.id)}
                                            >
                                                {assignedCrewIds.includes(u.id) ? '✓ ' : '+ '} {u.name}
                                            </button>
                                        ))}
                                </div>
                            </div>

                            <div className="edit-row">
                                <label>Job Segments (Comma-separated)</label>
                                <input
                                    type="text"
                                    className="edit-input"
                                    value={segmentsInput}
                                    onChange={(e) => setSegmentsInput(e.target.value)}
                                />
                            </div>

                            <div className="edit-row">
                                <label>Dispatch Notes for Field Crews</label>
                                <textarea
                                    className="justification-textarea"
                                    placeholder="Special gate codes, safety instructions, or supervisor notes..."
                                    value={dispatchNotes}
                                    onChange={(e) => setDispatchNotes(e.target.value)}
                                />
                            </div>

                            <div className="modal-btns">
                                <button type="submit" className="btn-dark">
                                    Create & Dispatch Job Site
                                </button>
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
