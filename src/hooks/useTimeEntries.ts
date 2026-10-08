import { useState, useEffect } from 'react';
import type { TimeEntry, Job, UserProfile, PTORequest, ContractorUnitLog, WorkType, LocationFlag, EquipmentUnit } from '../types';

const API_BASE = 'http://127.0.0.1:5000/api';

const OFFLINE_QUEUE_KEY = 'clock_offline_queue';

interface OfflineRequest {
    id: string;
    url: string;
    method: string;
    body?: any;
    timestamp: number;
}

export async function syncOfflineQueue() {
    const queueJson = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!queueJson) return;
    try {
        const queue: OfflineRequest[] = JSON.parse(queueJson);
        if (queue.length === 0) return;
        
        console.log(`Syncing ${queue.length} offline actions...`);
        const remainingQueue: OfflineRequest[] = [];
        
        for (const req of queue) {
            try {
                const options: RequestInit = {
                    method: req.method,
                    headers: { 'Content-Type': 'application/json' }
                };
                if (req.body) options.body = JSON.stringify(req.body);
                const res = await fetch(req.url, options);
                if (!res.ok) throw new Error('API Error');
            } catch (e) {
                remainingQueue.push(req);
            }
        }
        
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
    } catch (e) {
        console.error("Failed to sync offline queue", e);
    }
}

async function apiFetch(url: string, method: string, body?: any) {
    if (navigator.onLine) {
        try {
            const options: RequestInit = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };
            if (body) options.body = JSON.stringify(body);
            
            const res = await fetch(url, options);
            if (!res.ok) throw new Error('API Error');
            return;
        } catch (e) {
            console.warn("Network fetch failed, queueing offline");
        }
    } else {
        console.warn("Currently offline, queueing request");
    }
    
    const queueJson = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: OfflineRequest[] = queueJson ? JSON.parse(queueJson) : [];
    queue.push({ id: Math.random().toString(), url, method, body, timestamp: Date.now() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}


export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

export function useTimeEntries() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [ptoRequests, setPtoRequests] = useState<PTORequest[]>([]);
    const [contractorLogs, setContractorLogs] = useState<ContractorUnitLog[]>([]);
    const [equipmentList, setEquipmentList] = useState<EquipmentUnit[]>([]);
    
    // Fetch initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                const [usersRes, jobsRes, entriesRes, ptoRes, logsRes, eqRes] = await Promise.all([
                    fetch(`${API_BASE}/users`),
                    fetch(`${API_BASE}/jobs`),
                    fetch(`${API_BASE}/time_entries`),
                    fetch(`${API_BASE}/pto_requests`),
                    fetch(`${API_BASE}/contractor_logs`),
                    fetch(`${API_BASE}/equipment`)
                ]);
                
                const usersData = await usersRes.json();
                setUsers(usersData);
                setJobs(await jobsRes.json());
                setEntries(await entriesRes.json());
                setPtoRequests(await ptoRes.json());
                setContractorLogs(await logsRes.json());
                setEquipmentList(await eqRes.json());

                // Set initial user
                if (usersData.length > 0) {
                    const savedUserId = localStorage.getItem('clock_active_user_id');
                    const found = usersData.find((u: UserProfile) => u.id === savedUserId);
                    setCurrentUser(found || usersData[0]);
                }
            } catch (err) {
                console.error("Failed to fetch data from API", err);
            }
        };
        loadData();
    }, []);


    useEffect(() => {
        const handleOnline = () => syncOfflineQueue();
        window.addEventListener('online', handleOnline);
        if (navigator.onLine) syncOfflineQueue();
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('clock_active_user_id', currentUser.id);
        }
    }, [currentUser]);

    const switchActiveUser = (userId: string) => {
        const u = users.find(x => x.id === userId);
        if (u) setCurrentUser(u);
    };

    const activeEntry = currentUser ? (entries.find(e => e.userId === currentUser.id && e.end === null) ?? null) : null;
    const lastJobEntry = currentUser ? (entries.find(e => e.userId === currentUser.id && e.jobId !== 'break' && e.end !== null) ?? null) : null;

    // --- CLOCK IN / OUT ---
    const clockIn = async (targetUserId: string, jobId: string, segment: string, workType: WorkType = 'onsite', lat: number | null = null, lng: number | null = null, locationFlag: LocationFlag = null) => {
        if (!currentUser) return;
        const worker = users.find(u => u.id === targetUserId) || currentUser;
        const newEntry: TimeEntry = {
            id: `entry_${Date.now()}`,
            userId: worker.id,
            userName: worker.name,
            jobId, segment, workType,
            start: new Date().toISOString(), end: null, notes: '',
            lat, lng, locationFlag,
            supervisorStatus: locationFlag ? 'pending' : 'approved',
            editHistory: [],
            gpsRoute: workType === 'field' && lat && lng ? [{ lat, lng, timestamp: new Date().toISOString(), speedMph: 0 }] : undefined,
        };
        
        // Optimistic UI update
        setEntries(prev => [newEntry, ...prev]);
        
        await apiFetch(`${API_BASE}/time_entries`, 'POST', newEntry);
    };

    const clockOut = async (targetUserId: string = currentUser?.id || '', notes = '') => {
        const entry = entries.find(e => e.userId === targetUserId && e.end === null);
        if (!entry) return;
        
        const updated = { ...entry, end: new Date().toISOString(), notes: notes || entry.notes };
        setEntries(prev => prev.map(e => e.id === entry.id ? updated : e));
        
        await apiFetch(`${API_BASE}/time_entries/${entry.id}`, 'PUT', { end: updated.end, notes: updated.notes });
    };

    const editEntryWithJustification = async (entryId: string, newStart: string, newEnd: string | null, justification: string, editedByUserId: string, editedByUserName: string) => {
        const entry = entries.find(e => e.id === entryId);
        if (!entry) return;
        
        const editLog = { id: `edit_${Date.now()}`, editedAt: new Date().toISOString(), editedByUserId, editedByUserName, previousStart: entry.start, previousEnd: entry.end, newStart, newEnd, justification };
        const updatedHistory = [editLog, ...entry.editHistory];
        const updated = { ...entry, start: newStart, end: newEnd, locationFlag: 'manual_edit' as LocationFlag, supervisorStatus: 'approved' as const, editHistory: updatedHistory };
        
        setEntries(prev => prev.map(e => e.id === entryId ? updated : e));
        await apiFetch(`${API_BASE}/time_entries/${entryId}`, 'PUT', updated);
    };

    const approveEntry = async (entryId: string, approvedByUserId: string) => {
        const approvedAt = new Date().toISOString();
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, supervisorStatus: 'approved', approvedBy: approvedByUserId, approvedAt } : e));
        await apiFetch(`${API_BASE}/time_entries/${entryId}`, 'PUT', { supervisorStatus: 'approved', approvedBy: approvedByUserId, approvedAt });
    };

    const rejectEntry = async (entryId: string) => {
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, supervisorStatus: 'rejected' } : e));
        await apiFetch(`${API_BASE}/time_entries/${entryId}`, 'PUT', { supervisorStatus: 'rejected' });
    };

    const deleteEntry = async (entryId: string) => {
        setEntries(prev => prev.filter(e => e.id !== entryId));
        await apiFetch(`${API_BASE}/time_entries/${entryId}`, 'DELETE');
    };

    const requestPTO = async (request: Omit<PTORequest, 'id' | 'status'>) => {
        const newReq: PTORequest = { id: `pto_${Date.now()}`, ...request, status: 'pending' };
        setPtoRequests(prev => [newReq, ...prev]);
        await apiFetch(`${API_BASE}/pto_requests`, 'POST', newReq);
    };

    const reviewPTO = async (id: string, status: 'approved' | 'denied', notes: string) => {
        const reviewedBy = currentUser?.id;
        const reviewedAt = new Date().toISOString();
        setPtoRequests(prev => prev.map(r => r.id === id ? { ...r, status, supervisorNotes: notes, reviewedBy, reviewedAt } : r));
        await apiFetch(`${API_BASE}/pto_requests/${id}`, 'PUT', { status, supervisorNotes: notes, reviewedBy, reviewedAt });
    };

    const startContractorUnitLog = async (contractorId: string, contractorName: string, companyName: string, equipmentId: string, equipmentUnit: string, desc: string) => {
        const newLog: ContractorUnitLog = { id: `clog_${Date.now()}`, contractorId, contractorName, companyName, equipmentId, equipmentUnit, start: new Date().toISOString(), end: null, workDescription: desc, validatedBySupervisor: false };
        setContractorLogs(prev => [newLog, ...prev]);
        await apiFetch(`${API_BASE}/contractor_logs`, 'POST', newLog);
    };

    const switchContractorUnitLog = async (currentLogId: string, newEquipmentId: string, newEquipmentUnit: string, desc: string) => {
        const endIso = new Date().toISOString();
        const activeLog = contractorLogs.find(l => l.id === currentLogId);
        if (!activeLog) return;
        
        const nextLog: ContractorUnitLog = {
            id: `clog_${Date.now()}`, contractorId: activeLog.contractorId, contractorName: activeLog.contractorName, companyName: activeLog.companyName,
            equipmentId: newEquipmentId, equipmentUnit: newEquipmentUnit, start: endIso, end: null, workDescription: desc, validatedBySupervisor: false
        };
        
        setContractorLogs(prev => {
            const updated = prev.map(l => l.id === currentLogId ? { ...l, end: endIso } : l);
            return [nextLog, ...updated];
        });
        
        await apiFetch(`${API_BASE}/contractor_logs/${currentLogId}`, 'PUT', { end: endIso });
        await apiFetch(`${API_BASE}/contractor_logs`, 'POST', nextLog);
    };

    const endContractorUnitLog = async (logId: string, desc: string) => {
        const endIso = new Date().toISOString();
        setContractorLogs(prev => prev.map(l => l.id === logId ? { ...l, end: endIso, workDescription: desc || l.workDescription } : l));
        await apiFetch(`${API_BASE}/contractor_logs/${logId}`, 'PUT', { end: endIso, workDescription: desc });
    };

    const validateContractorLog = async (logId: string, notes: string) => {
        setContractorLogs(prev => prev.map(l => l.id === logId ? { ...l, validatedBySupervisor: true, validationNotes: notes } : l));
        await apiFetch(`${API_BASE}/contractor_logs/${logId}`, 'PUT', { validatedBySupervisor: true, validationNotes: notes });
    };

    const addJob = async (newJob: Omit<Job, 'id'>) => {
        const created: Job = { id: `j_${Date.now()}`, ...newJob };
        setJobs(prev => [...prev, created]);
        await apiFetch(`${API_BASE}/jobs`, 'POST', created);
    };

    const updateJob = async (id: string, changes: Partial<Job>) => {
        setJobs(prev => prev.map(j => j.id === id ? { ...j, ...changes } : j));
        await apiFetch(`${API_BASE}/jobs/${id}`, 'PUT', changes);
    };

    const deleteJob = async (id: string) => {
        setJobs(prev => prev.filter(j => j.id !== id));
        await apiFetch(`${API_BASE}/jobs/${id}`, 'DELETE');
    };

    const resetJobs = async () => {
        alert('Reset requires hitting backend seed script manually in this version.');
    };

    const canEditAndApprove = currentUser ? (currentUser.role === 'super_admin' || currentUser.role === 'supervisor' || currentUser.role === 'office_manager') : false;
    const canManageJobs = currentUser ? (currentUser.role === 'super_admin' || currentUser.role === 'supervisor') : false;
    const isContractorOnly = currentUser ? (currentUser.role === 'contractor') : false;

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
        equipmentList,
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
