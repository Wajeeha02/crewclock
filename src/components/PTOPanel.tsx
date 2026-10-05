// src/components/PTOPanel.tsx
import { useState } from 'react';
import type { UserProfile, PTORequest } from '../types';

interface PTOPanelProps {
    currentUser: UserProfile;
    users: UserProfile[];
    ptoRequests: PTORequest[];
    onRequestPTO: (request: Omit<PTORequest, 'id' | 'status'>) => void;
    onReviewPTO: (id: string, status: 'approved' | 'denied', notes: string) => void;
    canApprovePTO: boolean;
}

// Helper to calculate 4 hours accrued per month worked
export function calculatePTOAccrual(startDateIso: string, basePto: number = 0): { accrued: number; monthsWorked: number } {
    const start = new Date(startDateIso);
    const now = new Date();
    const yearsDiff = now.getFullYear() - start.getFullYear();
    const monthsDiff = now.getMonth() - start.getMonth();
    const totalMonths = Math.max(1, yearsDiff * 12 + monthsDiff);
    const accrued = basePto + (totalMonths * 4); // 4 hours per month worked
    return { accrued, monthsWorked: totalMonths };
}

export default function PTOPanel({
    currentUser,
    users,
    ptoRequests,
    onRequestPTO,
    onReviewPTO,
    canApprovePTO,
}: PTOPanelProps) {
    const [activeSubTab, setActiveSubTab] = useState<'my_pto' | 'approval_queue'>('my_pto');

    // New Request Form state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [totalHours, setTotalHours] = useState(8);
    const [reason, setReason] = useState('');
    const [showRequestModal, setShowRequestModal] = useState(false);

    // Review Modal State
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [supervisorNotes, setSupervisorNotes] = useState('');

    const userAccrual = calculatePTOAccrual(currentUser.startDate, currentUser.ptoAccruedBase);

    // Calculate used approved PTO
    const myRequests = ptoRequests.filter(r => r.userId === currentUser.id);
    const approvedPtoHours = myRequests
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + r.totalHours, 0);

    const remainingBalance = Math.max(0, userAccrual.accrued - approvedPtoHours);

    const handleRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate || !reason.trim()) return;

        onRequestPTO({
            userId: currentUser.id,
            userName: currentUser.name,
            startDate,
            endDate,
            totalHours: Number(totalHours),
            reason,
        });

        setShowRequestModal(false);
        setStartDate('');
        setEndDate('');
        setReason('');
        setTotalHours(8);
    };

    const pendingRequests = ptoRequests.filter(r => r.status === 'pending');

    return (
        <div className="pto-page">
            <div className="page-header">
                <div>
                    <span className="section-eyebrow">SES PAYROLL & LEAVE MANAGEMENT</span>
                    <h2>Paid Time Off (PTO) & Accruals</h2>
                </div>
                <button className="btn-dark" onClick={() => setShowRequestModal(true)}>
                    + Request Paid Time Off
                </button>
            </div>

            {/* Accrual Card Banner */}
            <div className="pto-accrual-banner">
                <div className="accrual-item">
                    <span className="accrual-label">Accrual Rate</span>
                    <span className="accrual-val">4.0 hrs / month</span>
                    <span className="accrual-sub">Based on start date ({currentUser.startDate})</span>
                </div>
                <div className="accrual-divider" />
                <div className="accrual-item">
                    <span className="accrual-label">Total Earned</span>
                    <span className="accrual-val">{userAccrual.accrued} hrs</span>
                    <span className="accrual-sub">{userAccrual.monthsWorked} months worked</span>
                </div>
                <div className="accrual-divider" />
                <div className="accrual-item">
                    <span className="accrual-label">Approved & Used</span>
                    <span className="accrual-val used">{approvedPtoHours} hrs</span>
                    <span className="accrual-sub">{myRequests.filter(r => r.status === 'approved').length} requests</span>
                </div>
                <div className="accrual-divider" />
                <div className="accrual-item highlight">
                    <span className="accrual-label">Remaining PTO Balance</span>
                    <span className="accrual-val remaining">{remainingBalance} hrs</span>
                    <span className="accrual-sub">Available for payout/time off</span>
                </div>
            </div>

            {/* ClockShark Rule Warning Banner */}
            <div className="clockshark-rule-card">

                <div className="cs-rule-content">
                    <h5>SES PTO Protection Engine (ClockShark Safety Rule)</h5>
                    <p>
                        Unlike legacy ClockShark where un-edited denied requests stay as approved & get paid,
                        <strong> denied PTO requests in this system automatically lock in an unpaid status</strong>.
                        They are strictly excluded from payroll calculations and cannot trigger accidental payment.
                    </p>
                </div>
            </div>

            {/* Subtabs */}
            <div className="pto-tabs">
                <button
                    className={`pto-tab ${activeSubTab === 'my_pto' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('my_pto')}
                >
                    My Requests & History ({myRequests.length})
                </button>
                {canApprovePTO && (
                    <button
                        className={`pto-tab ${activeSubTab === 'approval_queue' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('approval_queue')}
                    >
                        Supervisor Approval Queue ({pendingRequests.length})
                        {pendingRequests.length > 0 && <span className="tab-badge">{pendingRequests.length}</span>}
                    </button>
                )}
            </div>

            {/* My Requests Tab */}
            {activeSubTab === 'my_pto' && (
                <div className="pto-list">
                    {myRequests.length === 0 ? (
                        <div className="empty-pto-card">
                            <p>No PTO requests submitted yet. Click <strong>+ Request Paid Time Off</strong> to start.</p>
                        </div>
                    ) : (
                        myRequests.map((req) => (
                            <div key={req.id} className={`pto-item-card status-${req.status}`}>
                                <div className="pto-item-header">
                                    <div>
                                        <strong>{req.startDate} to {req.endDate}</strong>
                                        <span className="pto-hours-pill">{req.totalHours} PTO Hours</span>
                                    </div>
                                    <span className={`pto-status-tag ${req.status}`}>
                                        {req.status === 'approved' && '✓ Approved & Deducted'}
                                        {req.status === 'denied' && '✕ Denied (Unpaid / Excluded)'}
                                        {req.status === 'pending' && '⏳ Pending Review'}
                                    </span>
                                </div>
                                <p className="pto-reason">"{req.reason}"</p>
                                {req.supervisorNotes && (
                                    <div className="pto-supervisor-note">
                                        <span>Supervisor Note: {req.supervisorNotes}</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Supervisor Approval Queue Tab */}
            {activeSubTab === 'approval_queue' && canApprovePTO && (
                <div className="pto-approval-list">
                    <p className="queue-desc">
                        Review pending PTO requests for your crew. Denying a request locks it safely as unpaid.
                    </p>
                    {ptoRequests.length === 0 ? (
                        <div className="empty-pto-card">
                            <p>No PTO requests found across all employees.</p>
                        </div>
                    ) : (
                        ptoRequests.map((req) => (
                            <div key={req.id} className={`pto-item-card status-${req.status}`}>
                                <div className="pto-item-header">
                                    <div>
                                        <span className="user-name-badge">👤 {req.userName}</span>
                                        <strong>{req.startDate} – {req.endDate} ({req.totalHours} hrs)</strong>
                                    </div>
                                    <span className={`pto-status-tag ${req.status}`}>
                                        {req.status.toUpperCase()}
                                    </span>
                                </div>
                                <p className="pto-reason">Reason: "{req.reason}"</p>

                                {(() => {
                                    const reqUser = users.find(u => u.id === req.userId);
                                    const isReqSupervisor = reqUser?.role === 'supervisor' || reqUser?.role === 'super_admin';
                                    const canCurrentUserReview = currentUser.role === 'super_admin' || (!isReqSupervisor && currentUser.role === 'supervisor');

                                    if (req.status === 'pending') {
                                        if (!canCurrentUserReview) {
                                            return (
                                                <div className="pto-reviewed-footer">
                                                    <span style={{ color: '#EF4444' }}>⚠️ Only a Super Admin can approve PTO requests from Supervisors.</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="pto-action-row">
                                                <input
                                                    type="text"
                                                    className="pto-note-input"
                                                    placeholder="Optional note for employee..."
                                                    value={reviewingId === req.id ? supervisorNotes : ''}
                                                    onChange={(e) => {
                                                        setReviewingId(req.id);
                                                        setSupervisorNotes(e.target.value);
                                                    }}
                                                />
                                                <button
                                                    className="btn-approve-pto"
                                                    onClick={() => onReviewPTO(req.id, 'approved', supervisorNotes)}
                                                >
                                                    ✓ Approve PTO
                                                </button>
                                                <button
                                                    className="btn-deny-pto"
                                                    onClick={() => onReviewPTO(req.id, 'denied', supervisorNotes)}
                                                >
                                                    ✕ Deny Request (Lock as Unpaid)
                                                </button>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className="pto-reviewed-footer">
                                                <span>Reviewed by Supervisor. Notes: {req.supervisorNotes || 'None'}</span>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* PTO Request Modal */}
            {showRequestModal && (
                <div className="modal-overlay">
                    <div className="modal-sheet">
                        <h3>Request Paid Time Off</h3>
                        <p className="modal-sub">Earned Accrual: {remainingBalance} hours remaining</p>

                        <form onSubmit={handleRequestSubmit} className="edit-form">
                            <div className="edit-row">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    className="edit-input"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="edit-row">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    className="edit-input"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="edit-row">
                                <label>Total PTO Hours Requested</label>
                                <input
                                    type="number"
                                    className="edit-input"
                                    value={totalHours}
                                    onChange={(e) => setTotalHours(Number(e.target.value))}
                                    min={1}
                                    max={160}
                                    required
                                />
                            </div>
                            <div className="edit-row">
                                <label>Reason / Notes</label>
                                <textarea
                                    className="justification-textarea"
                                    placeholder="Brief reason for PTO request..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="modal-btns">
                                <button type="submit" className="btn-dark">Submit Request</button>
                                <button type="button" className="btn-ghost" onClick={() => setShowRequestModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
