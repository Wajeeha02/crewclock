// src/components/LandingLogin.tsx
import { useState } from 'react';
import type { UserProfile } from '../types';

interface LandingLoginProps {
    users: UserProfile[];
    onSelectUser: (userId: string) => void;
}

export default function LandingLogin({ users, onSelectUser }: LandingLoginProps) {
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

    const handleUserClick = (u: UserProfile) => {
        if (u.role === 'super_admin' || u.role === 'supervisor' || u.role === 'office_manager') {
            setSelectedUser(u);
            setPin('');
            setPinError(false);
        } else {
            // Employee or Contractor login directly
            onSelectUser(u.id);
        }
    };

    const handlePinSubmit = () => {
        // Simple demo pin '1234' for supervisor/admin access
        if (pin === '1234' || pin === '0000') {
            if (selectedUser) {
                onSelectUser(selectedUser.id);
            }
        } else {
            setPinError(true);
        }
    };

    return (
        <div className="landing-page">
            <div className="landing-card">
                <div className="brand-header">
                    <span className="brand-badge">SES CREWCLOCK SYSTEM</span>
                    <h1>T29 Time Clock & Dispatch</h1>
                    <p className="brand-sub">
                        Select a user persona to enter the prototype application. Test T29 role permissions, geofencing, PTO accruals, and contractor portals.
                    </p>
                </div>

                <div className="persona-selection-block">
                    <h3>Select Active Persona / Role</h3>

                    <div className="persona-grid">
                        {users.map((u) => (
                            <div
                                key={u.id}
                                className={`persona-card ${selectedUser?.id === u.id ? 'active' : ''}`}
                                onClick={() => handleUserClick(u)}
                            >
                                <div className="persona-card-top">
                                    <span className="user-avatar-lg">{u.avatar}</span>
                                    <span className={`role-badge ${u.role}`}>
                                        {u.role.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                                <h4 className="persona-name">{u.name}</h4>
                                <p className="persona-title">{u.title}</p>
                                <p className="persona-email">{u.email}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PIN Prompt Modal for Admin/Supervisor personas */}
                {selectedUser && (
                    <div className="pin-prompt-box">
                        <h4>🔒 Authorization PIN for {selectedUser.name}</h4>
                        <p className="pin-hint">Enter demo PIN <code>1234</code> to access T29 controls.</p>

                        <div className="pin-input-row">
                            <input
                                type="password"
                                className={`pin-input ${pinError ? 'error' : ''}`}
                                placeholder="PIN (1234)"
                                value={pin}
                                maxLength={6}
                                onChange={(e) => {
                                    setPin(e.target.value);
                                    setPinError(false);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                                autoFocus
                            />
                            <button className="btn-dark" onClick={handlePinSubmit}>
                                Enter as {selectedUser.name}
                            </button>
                            <button className="btn-ghost" onClick={() => setSelectedUser(null)}>
                                Cancel
                            </button>
                        </div>
                        {pinError && <p className="pin-error-msg">Incorrect PIN. Please use 1234.</p>}
                    </div>
                )}

                <div className="landing-footer-info">
                    <p>
                        💡 <strong>Prototype Info:</strong> No live API backend required for this demo build. All time entries, geofences, map pickers, edit justification audit logs, and PTO safety workflows function live in local session memory.
                    </p>
                </div>
            </div>
        </div>
    );
}
