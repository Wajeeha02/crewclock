// hooks/useTimeEntries.js
import { useState, useEffect } from 'react';

// Haversine formula: distance in meters between two lat/lng points
export function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Get current position as a Promise
export function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('GEOLOCATION_UNSUPPORTED'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => reject(new Error('GPS_DENIED')),
            { timeout: 8000, maximumAge: 60000 }
        );
    });
}

const SUPERVISOR_PIN = '1234'; // In production this would be server-side

export function useTimeEntries() {
    const [entries, setEntries] = useState(() => {
        try { return JSON.parse(localStorage.getItem('entries')) || []; }
        catch { return []; }
    });

    const [supervisorUnlocked, setSupervisorUnlocked] = useState(false);

    useEffect(() => {
        localStorage.setItem('entries', JSON.stringify(entries));
    }, [entries]);

    const active = entries.find((e) => e.end === null) || null;
    const lastJob = entries.find((e) => e.jobId !== 'break' && e.end !== null) || null;

    // Clock in with full metadata
    const clockIn = (jobId, taskId, workType = 'onsite', lat = null, lng = null, locationFlag = null) =>
        setEntries((prev) => [
            {
                id: crypto.randomUUID(),
                jobId,
                taskId,
                workType,          // 'onsite' | 'field'
                start: new Date().toISOString(),
                end: null,
                notes: '',
                lat,
                lng,
                locationFlag,      // null | 'outside_radius' | 'gps_denied'
                supervisorStatus: locationFlag ? 'pending' : 'approved',
            },
            ...prev,
        ]);

    const clockOut = (notes = '') =>
        setEntries((prev) =>
            prev.map((e) => (e.end === null ? { ...e, end: new Date().toISOString(), notes: notes || e.notes } : e))
        );

    const updateEntry = (id, changes) =>
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)));

    const deleteEntry = (id) =>
        setEntries((prev) => prev.filter((e) => e.id !== id));

    // Supervisor actions
    const approveEntry = (id) => updateEntry(id, { supervisorStatus: 'approved' });
    const rejectEntry = (id) => updateEntry(id, { supervisorStatus: 'rejected' });
    const editEntryTime = (id, start, end) => updateEntry(id, { start, end });

    const checkSupervisorPin = (pin) => {
        if (pin === SUPERVISOR_PIN) { setSupervisorUnlocked(true); return true; }
        return false;
    };
    const lockSupervisor = () => setSupervisorUnlocked(false);

    // Flagged entries needing supervisor review
    const flaggedEntries = entries.filter((e) => e.supervisorStatus === 'pending');

    return {
        entries, active, lastJob,
        clockIn, clockOut, updateEntry, deleteEntry,
        approveEntry, rejectEntry, editEntryTime,
        supervisorUnlocked, checkSupervisorPin, lockSupervisor,
        flaggedEntries,
    };
}