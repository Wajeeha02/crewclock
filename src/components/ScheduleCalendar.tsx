// src/components/ScheduleCalendar.tsx
import { useState } from 'react';
import type { Shift, Job, UserProfile } from '../types';

interface ScheduleCalendarProps {
    jobs: Job[];
    users: UserProfile[];
    shifts: Shift[];
    onAddShift: (shift: Omit<Shift, 'id'>) => void;
}

export default function ScheduleCalendar({ jobs, users, shifts, onAddShift }: ScheduleCalendarProps) {
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(today);

    // Form State
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
    const [selectedJob, setSelectedJob] = useState(jobs[0]?.id || '');
    const [assignedCrew, setAssignedCrew] = useState<string[]>([]);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('16:00');

    // Calculate Week Days
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });

    const handleAddShift = (e: React.FormEvent) => {
        e.preventDefault();
        onAddShift({
            jobId: selectedJob,
            assignedCrewIds: assignedCrew,
            date: selectedDate,
            startTime,
            endTime
        });
        setShowModal(false);
        setAssignedCrew([]);
    };

    const handleCrewToggle = (uid: string) => {
        setAssignedCrew(prev => 
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    return (
        <div className="schedule-calendar-wrapper">
            <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="btn-ghost-sm" onClick={() => {
                        const prev = new Date(currentDate);
                        prev.setDate(prev.getDate() - 7);
                        setCurrentDate(prev);
                    }}>← Prev Week</button>
                    <h3 style={{ margin: 0 }}>
                        {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                        {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </h3>
                    <button className="btn-ghost-sm" onClick={() => {
                        const next = new Date(currentDate);
                        next.setDate(next.getDate() + 7);
                        setCurrentDate(next);
                    }}>Next Week →</button>
                </div>
                <button className="btn-dark" onClick={() => setShowModal(true)}>+ Assign Shift</button>
            </div>

            <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {weekDays.map(day => {
                    const dateStr = day.toISOString().split('T')[0];
                    const dayShifts = shifts.filter(s => s.date === dateStr);
                    
                    return (
                        <div key={dateStr} className="calendar-day" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', minHeight: '300px', backgroundColor: 'var(--bg-card)' }}>
                            <div className="day-header" style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                                    {day.getDate()}
                                </div>
                            </div>
                            <div className="day-body" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {dayShifts.map(shift => {
                                    const job = jobs.find(j => j.id === shift.jobId);
                                    return (
                                        <div key={shift.id} className="shift-card" style={{ padding: '8px', backgroundColor: job ? `${job.color}15` : 'var(--bg-main)', borderLeft: `3px solid ${job?.color || '#ccc'}`, borderRadius: '4px', fontSize: '12px' }}>
                                            <div style={{ fontWeight: 700 }}>{job?.name || 'Unknown Job'}</div>
                                            <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>{shift.startTime} - {shift.endTime}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                                                {shift.assignedCrewIds.map(uid => {
                                                    const user = users.find(u => u.id === uid);
                                                    return (
                                                        <span key={uid} title={user?.name} style={{ backgroundColor: 'white', padding: '2px 4px', borderRadius: '4px', fontSize: '10px', border: '1px solid var(--border-color)' }}>
                                                            {user?.avatar || '?'}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-sheet" style={{ maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Schedule a Shift</h3>
                            <button className="btn-ghost-sm" onClick={() => setShowModal(false)} style={{ padding: '4px 8px' }}>✕</button>
                        </div>
                        <form className="edit-form" onSubmit={handleAddShift}>
                            <div className="edit-row">
                                <label>Date</label>
                                <input className="edit-input" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required />
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div className="edit-row" style={{ flex: 1 }}>
                                    <label>Start Time</label>
                                    <input className="edit-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                                </div>
                                <div className="edit-row" style={{ flex: 1 }}>
                                    <label>End Time</label>
                                    <input className="edit-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                                </div>
                            </div>
                            <div className="edit-row">
                                <label>Job Site</label>
                                <select className="edit-input" value={selectedJob} onChange={e => setSelectedJob(e.target.value)} required>
                                    {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                                </select>
                            </div>
                            <div className="edit-row">
                                <label>Assign Crew</label>
                                <div className="crew-select-grid">
                                    {users.map(u => (
                                        <button 
                                            key={u.id} 
                                            type="button"
                                            className={`crew-select-chip ${assignedCrew.includes(u.id) ? 'selected' : ''}`} 
                                            onClick={() => handleCrewToggle(u.id)}
                                        >
                                            {assignedCrew.includes(u.id) ? '✓ ' : '+ '} {u.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-btns">
                                <button type="submit" className="btn-dark">Save Shift</button>
                                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
