// src/components/JustificationModal.tsx
import { useState } from 'react';

interface JustificationModalProps {
    entryInfo: {
        id: string;
        userName: string;
        jobName: string;
        currentStart: string;
        currentEnd: string | null;
    };
    onSave: (newStart: string, newEnd: string | null, justification: string) => void;
    onCancel: () => void;
}

export default function JustificationModal({ entryInfo, onSave, onCancel }: JustificationModalProps) {
    const formatForInput = (iso: string | null) => {
        if (!iso) return '';
        const d = new Date(iso);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const [editStart, setEditStart] = useState(formatForInput(entryInfo.currentStart));
    const [editEnd, setEditEnd] = useState(formatForInput(entryInfo.currentEnd));
    const [justification, setJustification] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!justification.trim() || justification.trim().length < 5) {
            setError('A detailed written justification (min 5 characters) is required for all time edits.');
            return;
        }

        const newStartIso = new Date(editStart).toISOString();
        const newEndIso = editEnd ? new Date(editEnd).toISOString() : null;

        onSave(newStartIso, newEndIso, justification.trim());
    };

    return (
        <div className="modal-overlay">
            <div className="modal-sheet justification-modal">
                <div className="modal-header-row">
                    <h3>✏️ Supervisor Time Edit & Justification</h3>
                    <button className="btn-close" onClick={onCancel}>✕</button>
                </div>
                <p className="modal-sub">
                    Editing timesheet for <strong>{entryInfo.userName}</strong> on <strong>{entryInfo.jobName}</strong>.
                </p>

                <form onSubmit={handleSubmit} className="edit-justification-form">
                    <div className="edit-row">
                        <label>Clock In Time</label>
                        <input
                            type="datetime-local"
                            className="edit-input"
                            value={editStart}
                            onChange={(e) => setEditStart(e.target.value)}
                            required
                        />
                    </div>

                    <div className="edit-row">
                        <label>Clock Out Time</label>
                        <input
                            type="datetime-local"
                            className="edit-input"
                            value={editEnd}
                            onChange={(e) => setEditEnd(e.target.value)}
                        />
                    </div>

                    <div className="edit-row justification-row">
                        <label className="required-label">Mandatory Edit Justification Reason *</label>
                        <textarea
                            className="justification-textarea"
                            placeholder="e.g., Moved clock-in by 2 hours because employee arrived early for safety brief before cellular service returned..."
                            value={justification}
                            onChange={(e) => {
                                setJustification(e.target.value);
                                setError(null);
                            }}
                            rows={3}
                            required
                        />
                        <span className="justification-hint">
                            Required by SES payroll compliance policy. This justification will be logged in the permanent audit trail.
                        </span>
                    </div>

                    {error && <div className="error-banner">{error}</div>}

                    <div className="modal-btns">
                        <button type="submit" className="btn-dark">
                            Save Edit & Log Justification
                        </button>
                        <button type="button" className="btn-ghost" onClick={onCancel}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
