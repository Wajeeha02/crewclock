// src/hooks/useTimeEntries.ts
import { useState, useEffect } from 'react';
import type { TimeEntry, Job, UserProfile, PTORequest, ContractorUnitLog, WorkType, LocationFlag } from '../types';
import { INITIAL_USERS, INITIAL_JOBS, INITIAL_ENTRIES, INITIAL_PTO_REQUESTS, INITIAL_CONTRACTOR_LOGS, INITIAL_EQUIPMENT } from '../data/mockData';

// Haversine formula for GPS distance calculation in meters
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Get browser position as Promise
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

function loadStorage<T>(key: string, fallback: T): T {
    try {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
    } catch { }
    return fallback;
}

export function useTimeEntries() {
    const [users] = useState<UserProfile[]>(() => loadStorage('clock_users', INITIAL_USERS));
    const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
        const savedUserId = localStorage.getItem('clock_active_user_id');
        const found = users.find(u => u.id === savedUserId);
        return found || users[0]; // default Jeramiah or first user
    });

    const [entries, setEntries] = useState<TimeEntry[]>(() => loadStorage('clock_entries', INITIAL_ENTRIES));
    const [jobs, setJobs] = useState<Job[]>(() => loadStorage('clock_jobs', INITIAL_JOBS));
    const [ptoRequests, setPtoRequests] = useState<PTORequest[]>(() => loadStorage('clock_pto', INITIAL_PTO_REQUESTS));
    const [contractorLogs, setContractorLogs] = useState<ContractorUnitLog[]>(() => loadStorage('clock_contractor_logs', INITIAL_CONTRACTOR_LOGS));

    // Save to LocalStorage
    useEffect(() => { localStorage.setItem('clock_entries', JSON.stringify(entries)); }, [entries]);
    useEffect(() => { localStorage.setItem('clock_jobs', JSON.stringify(jobs)); }, [jobs]);
    useEffect(() => { localStorage.setItem('clock_pto', JSON.stringify(ptoRequests)); }, [ptoRequests]);
    useEffect(() => { localStorage.setItem('clock_contractor_logs', JSON.stringify(contractorLogs)); }, [contractorLogs]);
    useEffect(() => { localStorage.setItem('clock_active_user_id', currentUser.id); }, [currentUser]);

    // Role switch helper
    const switchActiveUser = (userId: string) => {
        const u = users.find(x => x.id === userId);
        if (u) setCurrentUser(u);
    };

    // Active entry for current logged in user
    const activeEntry = entries.find(e => e.userId === currentUser.id && e.end === null) ?? null;
    const lastJobEntry = entries.find(e => e.userId === currentUser.id && e.jobId !== 'break' && e.end !== null) ?? null;

    // ─── CLOCK IN / CLOCK OUT ───────────────────────────────────────────────
    const clockIn = (
        targetUserId: string,
        jobId: string,
        segment: string,
        workType: WorkType = 'onsite',
        lat: number | null = null,
        lng: number | null = null,
        locationFlag: LocationFlag = null
    ) => {
        const worker = users.find(u => u.id === targetUserId) || currentUser;
        const newEntry: TimeEntry = {
            id: `entry_${Date.now()}`,
            userId: worker.id,
            userName: worker.name,
            jobId,
            segment,
            workType,
            start: new Date().toISOString(),
            end: null,
            notes: '',
            lat,
            lng,
            locationFlag,
            supervisorStatus: locationFlag ? 'pending' : 'approved',
            editHistory: [],
            gpsRoute: workType === 'field' && lat && lng ? [{ lat, lng, timestamp: new Date().toISOString(), speedMph: 0 }] : undefined,
        };

        setEntries(prev => [newEntry, ...prev]);
    };

    const clockOut = (targetUserId: string = currentUser.id, notes = '') => {
        setEntries(prev =>
            prev.map(e => (e.userId === targetUserId && e.end === null)
                ? { ...e, end: new Date().toISOString(), notes: notes || e.notes }
                : e
            )
        );
    };

    // ─── TIME EDIT WITH MANDATORY JUSTIFICATION ────────────────────────────
    const editEntryWithJustification = (
        entryId: string,
        newStart: string,
        newEnd: string | null,
        justification: string,
        editedByUserId: string,
        editedByUserName: string
    ) => {
        setEntries(prev => prev.map(e => {
            if (e.id !== entryId) return e;

            const editLog = {
                id: `edit_${Date.now()}`,
                editedAt: new Date().toISOString(),
                editedByUserId,
                editedByUserName,
                previousStart: e.start,
                previousEnd: e.end,
                newStart,
                newEnd,
                justification,
            };

            return {
                ...e,
                start: newStart,
                end: newEnd,
                locationFlag: 'manual_edit',
                supervisorStatus: 'approved', // re-approved by supervisor edit
                editHistory: [editLog, ...e.editHistory],
            };
        }));
    };

    const approveEntry = (entryId: string, approvedByUserId: string) => {
        setEntries(prev => prev.map(e => e.id === entryId ? {
            ...e,
            supervisorStatus: 'approved',
            approvedBy: approvedByUserId,
            approvedAt: new Date().toISOString()
        } : e));
    };

    const rejectEntry = (entryId: string) => {
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, supervisorStatus: 'rejected' } : e));
    };

    const deleteEntry = (entryId: string) => {
        setEntries(prev => prev.filter(e => e.id !== entryId));
    };

    // ─── PTO ACTIONS (WITH SAFETY DENIAL WORKFLOW) ─────────────────────────
    const requestPTO = (request: Omit<PTORequest, 'id' | 'status'>) => {
        const newReq: PTORequest = {
            id: `pto_${Date.now()}`,
            ...request,
            status: 'pending',
        };
        setPtoRequests(prev => [newReq, ...prev]);
    };

    const reviewPTO = (id: string, status: 'approved' | 'denied', notes: string) => {
        setPtoRequests(prev => prev.map(r => {
            if (r.id !== id) return r;
            return {
                ...r,
                status,
                supervisorNotes: notes,
                reviewedBy: currentUser.id,
                reviewedAt: new Date().toISOString(),
            };
        }));
    };

    // ─── CONTRACTOR LOGGING ACTIONS ─────────────────────────────────────────
    const startContractorUnitLog = (
        contractorId: string,
        contractorName: string,
        companyName: string,
        equipmentId: string,
        equipmentUnit: string,
        desc: string
    ) => {
        const newLog: ContractorUnitLog = {
            id: `clog_${Date.now()}`,
            contractorId,
            contractorName,
            companyName,
            equipmentId,
            equipmentUnit,
            start: new Date().toISOString(),
            end: null,
            workDescription: desc,
            validatedBySupervisor: false,
        };
        setContractorLogs(prev => [newLog, ...prev]);
    };

    const switchContractorUnitLog = (
        currentLogId: string,
        newEquipmentId: string,
        newEquipmentUnit: string,
        desc: string
    ) => {
        const endIso = new Date().toISOString();
        setContractorLogs(prev => {
            const updated = prev.map(l => l.id === currentLogId ? { ...l, end: endIso } : l);
            const activeLog = prev.find(l => l.id === currentLogId);
            if (!activeLog) return updated;

            const nextLog: ContractorUnitLog = {
                id: `clog_${Date.now()}`,
                contractorId: activeLog.contractorId,
                contractorName: activeLog.contractorName,
                companyName: activeLog.companyName,
                equipmentId: newEquipmentId,
                equipmentUnit: newEquipmentUnit,
                start: endIso,
                end: null,
                workDescription: desc,
                validatedBySupervisor: false,
            };

            return [nextLog, ...updated];
        });
    };

    const endContractorUnitLog = (logId: string, desc: string) => {
        setContractorLogs(prev => prev.map(l => l.id === logId ? {
            ...l,
            end: new Date().toISOString(),
            workDescription: desc || l.workDescription
        } : l));
    };

    const validateContractorLog = (logId: string, notes: string) => {
        setContractorLogs(prev => prev.map(l => l.id === logId ? {
            ...l,
            validatedBySupervisor: true,
            validationNotes: notes
        } : l));
    };

    // ─── JOBS MANAGEMENT ───────────────────────────────────────────────────
    const addJob = (newJob: Omit<Job, 'id'>) => {
        const created: Job = { id: `j_${Date.now()}`, ...newJob };
        setJobs(prev => [...prev, created]);
    };

    const updateJob = (id: string, changes: Partial<Job>) => {
        setJobs(prev => prev.map(j => j.id === id ? { ...j, ...changes } : j));
    };

    const deleteJob = (id: string) => {
        setJobs(prev => prev.filter(j => j.id !== id));
    };

    const resetJobs = () => {
        setJobs(INITIAL_JOBS);
        localStorage.setItem('clock_jobs', JSON.stringify(INITIAL_JOBS));
    };

    // Permissions logic helper
    const canEditAndApprove = currentUser.role === 'super_admin' || currentUser.role === 'supervisor' || currentUser.role === 'office_manager';
    const canManageJobs = currentUser.role === 'super_admin' || currentUser.role === 'supervisor';
    const isContractorOnly = currentUser.role === 'contractor';

    const pendingExceptionsCount = entries.filter(e => e.supervisorStatus === 'pending' || e.locationFlag !== null).length +
        ptoRequests.filter(r => r.status === 'pending').length;

    return {
        users,
        currentUser,
        switchActiveUser,
        entries,
        activeEntry,
        lastJobEntry,
        jobs,
        ptoRequests,
        contractorLogs,
        equipmentList: INITIAL_EQUIPMENT,
        clockIn,
        clockOut,
        editEntryWithJustification,
        approveEntry,
        rejectEntry,
        deleteEntry,
        requestPTO,
        reviewPTO,
        startContractorUnitLog,
        switchContractorUnitLog,
        endContractorUnitLog,
        validateContractorLog,
        addJob,
        updateJob,
        deleteJob,
        resetJobs,
        canEditAndApprove,
        canManageJobs,
        isContractorOnly,
        pendingExceptionsCount,
    };
}
