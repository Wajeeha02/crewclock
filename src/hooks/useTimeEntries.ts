// hooks/useTimeEntries.ts
import { useState, useEffect } from 'react';
import { JOBS, type Job } from '../data/jobs';

export type LocationFlag = 'outside_radius' | 'gps_denied' | null;
export type SupervisorStatus = 'pending' | 'approved' | 'rejected';
export type WorkType = 'onsite' | 'field';

export interface TimeEntry {
    id: string;
    jobId: string;
    taskId: string | null;
    workType: WorkType;
    start: string;
    end: string | null;
    notes: string;
    lat: number | null;
    lng: number | null;
    locationFlag: LocationFlag;
    supervisorStatus: SupervisorStatus;
}

// Haversine formula: distance in meters between two lat/lng points
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Get current position as a Promise
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('GEOLOCATION_UNSUPPORTED'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => reject(new Error('GPS_DENIED')),
            { timeout: 8000, maximumAge: 60000 }
        );
    });
}

const SUPERVISOR_PIN = '1234';

function loadEntries(): TimeEntry[] {
    try { return JSON.parse(localStorage.getItem('entries') ?? '[]') || []; }
    catch { return []; }
}

function loadJobs(): Job[] {
    try {
        const stored = localStorage.getItem('jobs');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch { }
    return JOBS;
}

export type UserRole = 'none' | 'supervisor' | 'employee';

function loadRole(): UserRole {
    try {
        const stored = localStorage.getItem('userRole');
        if (stored === 'supervisor' || stored === 'employee') return stored;
    } catch {}
    return 'none';
}

export function useTimeEntries() {
    const [entries, setEntries] = useState<TimeEntry[]>(loadEntries);
    const [jobs, setJobs] = useState<Job[]>(loadJobs);
    const [userRole, setUserRole] = useState<UserRole>(loadRole);
    const [supervisorUnlocked, setSupervisorUnlocked] = useState(() => loadRole() === 'supervisor');

    useEffect(() => {
        localStorage.setItem('entries', JSON.stringify(entries));
    }, [entries]);

    useEffect(() => {
        localStorage.setItem('userRole', userRole);
    }, [userRole]);

    useEffect(() => {
        if (jobs.length === 0) {
            setJobs(JOBS);
        } else {
            localStorage.setItem('jobs', JSON.stringify(jobs));
        }
    }, [jobs]);

    const active = entries.find((e) => e.end === null) ?? null;
    const lastJob = entries.find((e) => e.jobId !== 'break' && e.end !== null) ?? null;

    const clockIn = (
        jobId: string,
        taskId: string | null,
        workType: WorkType = 'onsite',
        lat: number | null = null,
        lng: number | null = null,
        locationFlag: LocationFlag = null,
    ) =>
        setEntries((prev) => [
            {
                id: crypto.randomUUID(),
                jobId,
                taskId,
                workType,
                start: new Date().toISOString(),
                end: null,
                notes: '',
                lat,
                lng,
                locationFlag,
                supervisorStatus: locationFlag ? 'pending' : 'approved',
            },
            ...prev,
        ]);

    const clockOut = (notes = '') =>
        setEntries((prev) =>
            prev.map((e) => (e.end === null ? { ...e, end: new Date().toISOString(), notes: notes || e.notes } : e))
        );

    const updateEntry = (id: string, changes: Partial<TimeEntry>) =>
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)));

    const deleteEntry = (id: string) =>
        setEntries((prev) => prev.filter((e) => e.id !== id));

    const approveEntry = (id: string) => updateEntry(id, { supervisorStatus: 'approved' });
    const rejectEntry = (id: string) => updateEntry(id, { supervisorStatus: 'rejected' });
    const editEntryTime = (id: string, start: string, end: string | null) => updateEntry(id, { start, end });

    const checkSupervisorPin = (pin: string): boolean => {
        if (pin === SUPERVISOR_PIN) {
            setSupervisorUnlocked(true);
            setUserRole('supervisor');
            return true;
        }
        return false;
    };

    const loginAsEmployee = () => {
        setUserRole('employee');
        setSupervisorUnlocked(false);
    };

    const logoutRole = () => {
        setUserRole('none');
        setSupervisorUnlocked(false);
    };

    const lockSupervisor = () => {
        logoutRole();
    };

    const updateJob = (id: string, changes: Partial<Job>) => {
        setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...changes } : j)));
    };

    const deleteJob = (id: string) => {
        setJobs((prev) => prev.filter((j) => j.id !== id));
    };

    const addJob = (newJob: Omit<Job, 'id'>) => {
        const created: Job = {
            id: `j_${Date.now()}`,
            ...newJob,
        };
        setJobs((prev) => [...prev, created]);
    };

    const resetDummyJobs = () => {
        setJobs(JOBS);
        localStorage.setItem('jobs', JSON.stringify(JOBS));
    };

    const flaggedEntries = entries.filter((e) => e.supervisorStatus === 'pending');

    return {
        entries, active, lastJob, jobs, updateJob, deleteJob, addJob, resetDummyJobs,
        clockIn, clockOut, updateEntry, deleteEntry,
        approveEntry, rejectEntry, editEntryTime,
        userRole, setUserRole, loginAsEmployee, logoutRole,
        supervisorUnlocked, checkSupervisorPin, lockSupervisor,
        flaggedEntries,
    };
}
