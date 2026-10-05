// src/types/index.ts

export type UserRole = 'super_admin' | 'supervisor' | 'office_manager' | 'employee' | 'contractor';

export interface UserProfile {
    id: string;
    name: string;
    role: UserRole;
    email: string;
    avatar: string;
    title: string;
    hourlyRate: number;
    startDate: string; // Used for PTO accrual (4 hrs/month)
    ptoAccruedBase: number; // Manually configured offset or historical PTO hours
}

export type LocationFlag = 'outside_radius' | 'gps_denied' | 'manual_edit' | 'overtime_flag' | null;
export type SupervisorStatus = 'pending' | 'approved' | 'rejected';
export type WorkType = 'onsite' | 'field';

export interface EditAuditLog {
    id: string;
    editedAt: string;
    editedByUserId: string;
    editedByUserName: string;
    previousStart: string;
    previousEnd: string | null;
    newStart: string;
    newEnd: string | null;
    justification: string;
}

export interface GPSPoint {
    lat: number;
    lng: number;
    timestamp: string;
    speedMph?: number;
}

export interface TimeEntry {
    id: string;
    userId: string;
    userName: string;
    jobId: string;
    segment: string;
    workType: WorkType;
    start: string; // ISO string
    end: string | null; // ISO string or null if clocked in
    notes: string;
    lat: number | null;
    lng: number | null;
    locationFlag: LocationFlag;
    supervisorStatus: SupervisorStatus;
    approvedBy?: string;
    approvedAt?: string;
    editHistory: EditAuditLog[];
    gpsRoute?: GPSPoint[];
}

export interface JobSegment {
    id: string;
    name: string;
    code: string;
}

export interface Job {
    id: string;
    name: string;
    code: string;
    address: string;
    lat: number;
    lng: number;
    radius: number; // Geofence radius in meters
    color: string;
    assignedCrewIds: string[];
    segments: JobSegment[];
    dispatchNotes?: string;
    status: 'active' | 'scheduled' | 'completed';
}

export interface PTORequest {
    id: string;
    userId: string;
    userName: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    totalHours: number;
    reason: string;
    status: 'pending' | 'approved' | 'denied';
    supervisorNotes?: string;
    reviewedBy?: string;
    reviewedAt?: string;
}

export interface EquipmentUnit {
    id: string;
    name: string;
    type: string;
    unitNumber: string;
}

export interface ContractorUnitLog {
    id: string;
    contractorId: string;
    contractorName: string;
    companyName: string;
    equipmentUnit: string;
    equipmentId: string;
    start: string;
    end: string | null;
    workDescription: string;
    validatedBySupervisor: boolean;
    validationNotes?: string;
}

export interface ExceptionFlag {
    id: string;
    entryId: string;
    type: 'outside_radius' | 'gps_denied' | 'manual_edit' | 'pto_denied_conflict' | 'contractor_unvalidated';
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    timestamp: string;
    resolved: boolean;
}
