// components/LandingLogin.tsx
import { useState } from 'react';

interface LandingLoginProps {
    onSupervisorLogin: (pin: string) => boolean;
    onEmployeeLogin: () => void;
}

export default function LandingLogin({ onSupervisorLogin, onEmployeeLogin }: LandingLoginProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    const handleSupervisorSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const success = onSupervisorLogin(pin);
        if (!success) {
            setError(true);
            setPin('');
        }
    };

    return (
        <div className="login-landing-container">
            <div className="login-landing-card">
                <div className="landing-brand">
                    <div className="landing-logo-badge">CREWCLOCK.</div>
                    <h2>Welcome to CrewClock</h2>
                    <p className="landing-subtitle">Select your portal access level to continue</p>
                </div>

                <div className="landing-options-grid">
                    {/* Supervisor Option */}
                    <div className="landing-role-card supervisor-card">
                        <div className="role-header">
                            <div>
                                <h3>Supervisor Access</h3>
                                <p className="role-desc">Full dashboard, time approvals & job site management</p>
                            </div>
                        </div>

                        <form onSubmit={handleSupervisorSubmit} className="landing-pin-form">
                            <label className="pin-label">ENTER SUPERVISOR PIN</label>
                            <div className="pin-input-group">
                                <input
                                    type="password"
                                    className={`landing-pin-input ${error ? 'error' : ''}`}
                                    placeholder="Enter PIN (e.g. 1234)"
                                    value={pin}
                                    maxLength={6}
                                    onChange={(e) => {
                                        setPin(e.target.value);
                                        setError(false);
                                    }}
                                />
                                <button type="submit" className="landing-btn supervisor-btn">
                                    Login as Supervisor
                                </button>
                            </div>
                            {error && <p className="landing-pin-error">⚠️ Incorrect PIN. Enter 1234 to proceed.</p>}
                            <div className="demo-pin-pill">Demo PIN: <code>1234</code></div>
                        </form>
                    </div>

                    <div className="landing-divider-line">
                        <span>OR</span>
                    </div>

                    {/* Employee Option */}
                    <div className="landing-role-card employee-card">
                        <div className="role-header">
                            <div>
                                <h3>Employee Access</h3>
                                <p className="role-desc">Clock in/out on field jobs & view personal timesheets</p>
                            </div>
                        </div>

                        <div className="landing-employee-action">
                            <button
                                type="button"
                                className="landing-btn employee-btn"
                                onClick={onEmployeeLogin}
                            >
                                Enter Site as Employee →
                            </button>
                        </div>
                    </div>
                </div>

                <div className="landing-footer-info">
                    <span> CrewClock Geofenced Time & Location Tracking System</span>
                </div>
            </div>
        </div>
    );
}
