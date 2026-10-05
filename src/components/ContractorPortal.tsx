// src/components/ContractorPortal.tsx
import { useState } from 'react';
import type { ContractorUnitLog, EquipmentUnit, UserProfile } from '../types';

interface ContractorPortalProps {
    currentUser: UserProfile;
    equipmentList: EquipmentUnit[];
    contractorLogs: ContractorUnitLog[];
    onLogStart: (contractorId: string, contractorName: string, company: string, equipmentId: string, equipmentUnit: string, desc: string) => void;
    onLogSwitch: (logId: string, newEquipmentId: string, newEquipmentUnit: string, desc: string) => void;
    onLogEnd: (logId: string, desc: string) => void;
    onValidateLog: (logId: string, notes: string) => void;
    isT29View?: boolean;
}

export default function ContractorPortal({
    currentUser,
    equipmentList,
    contractorLogs,
    onLogStart,
    onLogSwitch,
    onLogEnd,
    onValidateLog,
    isT29View = false,
}: ContractorPortalProps) {
    // Active contractor logging state
    const activeLog = contractorLogs.find(l => l.contractorId === currentUser.id && l.end === null);

    const [selectedEquipId, setSelectedEquipId] = useState(equipmentList[0]?.id || 'eq1');
    const [workDesc, setWorkDesc] = useState('');
    const [companyName, setCompanyName] = useState('Apex Precision Welding LLC');
    const [valNotes, setValNotes] = useState('');

    const formatTime = (iso: string | null) => {
        if (!iso) return 'In Progress';
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getEquipName = (id: string) => equipmentList.find(e => e.id === id)?.name || id;

    const handleStartWork = (e: React.FormEvent) => {
        e.preventDefault();
        const eqName = getEquipName(selectedEquipId);
        onLogStart(currentUser.id, currentUser.name, companyName, selectedEquipId, eqName, workDesc);
        setWorkDesc('');
    };

    const handleSwitchUnit = () => {
        if (!activeLog) return;
        const eqName = getEquipName(selectedEquipId);
        onLogSwitch(activeLog.id, selectedEquipId, eqName, workDesc || 'Switched equipment unit mid-shift');
        setWorkDesc('');
    };

    const handleEndShift = () => {
        if (!activeLog) return;
        onLogEnd(activeLog.id, workDesc);
        setWorkDesc('');
    };

    // ─── T29 READ-ONLY SUPERVISOR AUDIT VIEW ──────────────────────────────
    if (isT29View) {
        return (
            <div className="contractor-t29-panel">
                <div className="page-header">
                    <div>
                        <span className="section-eyebrow">PRIORITY 3 CONTRACTOR COMPLIANCE</span>
                        <h2>Contractor Equipment & Billed Hours Audit</h2>
                    </div>
                    <div className="security-badge-pill">
                        External Portal Data (Read-Only inside T29)
                    </div>
                </div>

                <div className="contractor-security-notice">
                    <p>
                        <strong>Security Scoping:</strong> Contractors have zero login credentials or access to T29 core system.
                        Contractor data is submitted externally via the public SES Contractor Portal and synced here read-only for supervisor validation.
                    </p>
                </div>

                <div className="contractor-logs-table-card">
                    <table className="ts-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Contractor & Firm</th>
                                <th>Equipment / Unit</th>
                                <th>Duration / Hours</th>
                                <th>Work Description</th>
                                <th>Validation Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contractorLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                                        No contractor equipment logs recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                contractorLogs.map((log) => {
                                    const startMs = new Date(log.start).getTime();
                                    const endMs = log.end ? new Date(log.end).getTime() : Date.now();
                                    const hrs = ((endMs - startMs) / (1000 * 3600)).toFixed(2);

                                    return (
                                        <tr key={log.id} className={log.end === null ? 'row-active' : ''}>
                                            <td>{formatDate(log.start)}</td>
                                            <td>
                                                <strong>{log.contractorName}</strong>
                                                <br />
                                                <small style={{ color: '#9CA3AF' }}>{log.companyName}</small>
                                            </td>
                                            <td>
                                                <span className="unit-badge">{log.equipmentUnit}</span>
                                            </td>
                                            <td>
                                                <strong>{hrs} hrs</strong>
                                                <br />
                                                <small style={{ color: '#6B7280' }}>
                                                    {formatTime(log.start)} – {formatTime(log.end)}
                                                </small>
                                            </td>
                                            <td>
                                                <p className="log-desc-text">"{log.workDescription}"</p>
                                            </td>
                                            <td>
                                                {log.validatedBySupervisor ? (
                                                    <span className="validated-tag">✓ Verified by Supervisor</span>
                                                ) : (
                                                    <span className="unvalidated-tag">Pending Verification</span>
                                                )}
                                                {log.validationNotes && (
                                                    <div className="val-note">Note: {log.validationNotes}</div>
                                                )}
                                            </td>
                                            <td>
                                                {!log.validatedBySupervisor && (
                                                    <div className="validate-action-cell">
                                                        <button
                                                            className="btn-dark-sm"
                                                            onClick={() => {
                                                                onValidateLog(log.id, valNotes || 'Verified equipment log and hours.');
                                                                setValNotes('');
                                                            }}
                                                        >
                                                            Verify Hours
                                                        </button>
                                                    </div>
                                                )}
                                                {log.validatedBySupervisor && (
                                                    <span className="audit-ok">Locked</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // ─── EXTERNAL CONTRACTOR STANDALONE PORTAL ──────────────────────────────
    return (
        <div className="contractor-portal-page">
            <div className="portal-brand-header">
                <div className="brand-pill">SES EXTERNAL VENDOR PORTAL</div>
                <h2>Equipment & Yard Hour Tracker</h2>
                <p className="portal-sub">
                    Welcome, <strong>{currentUser.name}</strong> ({companyName}). Log unit numbers & time for billing justification.
                </p>
            </div>

            {/* Active Shift Card */}
            {activeLog ? (
                <div className="active-unit-card">
                    <div className="unit-card-top">
                        <span className="pulsing-red-badge">🔴 ACTIVE WORK IN PROGRESS</span>
                        <span className="unit-number-title">{activeLog.equipmentUnit}</span>
                    </div>

                    <div className="unit-card-timer">
                        <span>Started at: {formatTime(activeLog.start)}</span>
                    </div>

                    <div className="unit-switch-block">
                        <label>Need to switch to a different unit mid-shift?</label>
                        <div className="switch-controls">
                            <select
                                className="unit-select"
                                value={selectedEquipId}
                                onChange={(e) => setSelectedEquipId(e.target.value)}
                            >
                                {equipmentList.map((eq) => (
                                    <option key={eq.id} value={eq.id}>
                                        {eq.name} ({eq.unitNumber})
                                    </option>
                                ))}
                            </select>
                            <button className="btn-switch-unit" onClick={handleSwitchUnit}>
                                🔄 Switch Unit Mid-Shift
                            </button>
                        </div>
                    </div>

                    <div className="shift-note-input-block">
                        <label>Update Work Description for Supervisor</label>
                        <input
                            type="text"
                            className="notes-field"
                            placeholder="Describe current fabrication, welding, or repair work..."
                            value={workDesc}
                            onChange={(e) => setWorkDesc(e.target.value)}
                        />
                    </div>

                    <div className="active-unit-actions">
                        <button className="btn-dark btn-clock-out" onClick={handleEndShift}>
                            🏁 End Shift & Save Unit Log
                        </button>
                    </div>
                </div>
            ) : (
                /* Start Shift / Start Unit Log */
                <div className="start-unit-card">
                    <h3>Start Equipment Unit Logging</h3>
                    <form onSubmit={handleStartWork} className="edit-form">
                        <div className="edit-row">
                            <label>Contractor Firm Name</label>
                            <input
                                type="text"
                                className="edit-input"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="edit-row">
                            <label>Select Equipment / Unit Working On</label>
                            <select
                                className="edit-input"
                                value={selectedEquipId}
                                onChange={(e) => setSelectedEquipId(e.target.value)}
                            >
                                {equipmentList.map((eq) => (
                                    <option key={eq.id} value={eq.id}>
                                        {eq.name} ({eq.unitNumber})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="edit-row">
                            <label>Work Description / Justification</label>
                            <textarea
                                className="justification-textarea"
                                placeholder="e.g. Welding trailer hitch and hard-facing excavator bucket teeth..."
                                value={workDesc}
                                onChange={(e) => setWorkDesc(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-dark btn-clock-in">
                            ↗ Begin Equipment Work Shift
                        </button>
                    </form>
                </div>
            )}

            {/* Contractor History */}
            <div className="section-block" style={{ marginTop: '24px' }}>
                <div className="section-row-header">
                    <span className="section-label">Your Logged Unit History</span>
                </div>

                <div className="entries-list-flat">
                    {contractorLogs
                        .filter((l) => l.contractorId === currentUser.id)
                        .map((l) => (
                            <div key={l.id} className="entry-row">
                                <div className="entry-row-today">{formatDate(l.start)}</div>
                                <div className="entry-row-info">
                                    <strong>{l.equipmentUnit}</strong>
                                    <span>
                                        {formatTime(l.start)} – {formatTime(l.end)} · "{l.workDescription}"
                                    </span>
                                </div>
                                <div className="entry-row-right">
                                    {l.validatedBySupervisor ? (
                                        <span className="synced-label">✓ Validated</span>
                                    ) : (
                                        <span className="pending-label">Pending Verification</span>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
