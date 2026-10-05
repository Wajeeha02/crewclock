// src/data/mockData.ts
import type { UserProfile, Job, PTORequest, ContractorUnitLog, TimeEntry, EquipmentUnit } from '../types';

export const INITIAL_USERS: UserProfile[] = [
    {
        id: 'u1',
        name: 'Jeramiah Smith',
        role: 'super_admin',
        email: 'jeramiah@ses-corp.com',
        avatar: 'JS',
        title: 'Operations Director',
        hourlyRate: 65,
        startDate: '2023-01-15',
        ptoAccruedBase: 48,
    },
    {
        id: 'u2',
        name: 'Marcelo Alvarez',
        role: 'supervisor',
        email: 'marcelo@ses-corp.com',
        avatar: 'MA',
        title: 'Field Supervisor',
        hourlyRate: 45,
        startDate: '2023-06-01',
        ptoAccruedBase: 36,
    },
    {
        id: 'u3',
        name: 'Mirza Baig',
        role: 'office_manager',
        email: 'mirza@ses-corp.com',
        avatar: 'MB',
        title: 'Payroll & HR Manager',
        hourlyRate: 50,
        startDate: '2023-03-10',
        ptoAccruedBase: 40,
    },
    {
        id: 'u4',
        name: 'Marcus Vance',
        role: 'employee',
        email: 'marcus.v@ses-corp.com',
        avatar: 'MV',
        title: 'Field Technician',
        hourlyRate: 32,
        startDate: '2024-01-10',
        ptoAccruedBase: 28,
    },
    {
        id: 'u5',
        name: 'Carlos Rivera',
        role: 'employee',
        email: 'carlos.r@ses-corp.com',
        avatar: 'CR',
        title: 'Equipment Operator',
        hourlyRate: 34,
        startDate: '2024-03-01',
        ptoAccruedBase: 24,
    },
    {
        id: 'u6',
        name: 'Alex "Sparks" Miller',
        role: 'contractor',
        email: 'alex.welding@vendor.com',
        avatar: 'AM',
        title: 'Specialist Yard Welder',
        hourlyRate: 75,
        startDate: '2024-05-15',
        ptoAccruedBase: 0,
    },
];

export const INITIAL_EQUIPMENT: EquipmentUnit[] = [
    { id: 'eq1', name: 'Lincoln Electric Yard Welder #04', type: 'Welder', unitNumber: 'W-04' },
    { id: 'eq2', name: 'CAT 320 Heavy Hydraulic Excavator #12', type: 'Excavator', unitNumber: 'E-12' },
    { id: 'eq3', name: 'Miller Trailer Mobile Generator #02', type: 'Generator', unitNumber: 'G-02' },
    { id: 'eq4', name: 'Bobcat T76 Compact Track Loader #08', type: 'Loader', unitNumber: 'L-08' },
];

export const INITIAL_JOBS: Job[] = [
    {
        id: 'j1',
        name: 'SCS Main Headquarters & Yard',
        code: 'JOB-101',
        address: '100 Enterprise Way, Suite 400',
        lat: 37.7749,
        lng: -122.4194,
        radius: 300, // 300 meters geofence as requested
        color: '#3B82F6',
        assignedCrewIds: ['u4', 'u5'],
        segments: [
            { id: 'seg1', name: '01 - Yard Prep & Loading', code: 'YARD-01' },
            { id: 'seg2', name: '02 - Fabrication & Assembly', code: 'FAB-02' },
            { id: 'seg3', name: '03 - Maintenance & Inspection', code: 'MAINT-03' },
        ],
        dispatchNotes: 'Check in with Yard Supervisor upon arrival. Hard hat and steel-toes required.',
        status: 'active',
    },
    {
        id: 'j2',
        name: 'Metro Plaza Substation Remodel',
        code: 'JOB-204',
        address: '450 Mission Street, San Francisco, CA',
        lat: 37.7901,
        lng: -122.3995,
        radius: 250,
        color: '#10B981',
        assignedCrewIds: ['u4'],
        segments: [
            { id: 'seg4', name: '10 - Conduit & Wire Pulling', code: 'ELEC-10' },
            { id: 'seg5', name: '12 - Transformer Installation', code: 'ELEC-12' },
        ],
        dispatchNotes: 'Security gate code #4921. Contact Site Foreman Dave on radio Ch 4.',
        status: 'active',
    },
    {
        id: 'j3',
        name: 'Highway 101 Overpass & Lighting',
        code: 'JOB-308',
        address: 'Hwy 101 Exit 412, San Mateo, CA',
        lat: 37.5630,
        lng: -122.3255,
        radius: 400,
        color: '#F59E0B',
        assignedCrewIds: ['u5'],
        segments: [
            { id: 'seg6', name: '20 - Trenching & Utility Digging', code: 'CIV-20' },
            { id: 'seg7', name: '22 - High Voltage Wire Rigging', code: 'ELEC-22' },
        ],
        dispatchNotes: 'Night shift lane closures active. High-visibility vest required.',
        status: 'active',
    },
    {
        id: 'j4',
        name: 'Bay Solar Farm Substation Phase 2',
        code: 'JOB-412',
        address: '8800 Solar Valley Rd, Fremont, CA',
        lat: 37.5483,
        lng: -121.9886,
        radius: 500,
        color: '#8B5CF6',
        assignedCrewIds: ['u4', 'u5'],
        segments: [
            { id: 'seg8', name: '30 - Panel Array Testing', code: 'SOL-30' },
            { id: 'seg9', name: '35 - Inverter Hookup', code: 'SOL-35' },
        ],
        dispatchNotes: 'GPS tracking active due to vast remote site boundary.',
        status: 'scheduled',
    },
];

// Helper date generator for recent timestamps
const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();
const daysAgo = (d: number, h = 8) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - d);
    dt.setHours(h, 0, 0, 0);
    return dt.toISOString();
};
const daysAgoEnd = (d: number, h = 16.5) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - d);
    dt.setHours(Math.floor(h), (h % 1) * 60, 0, 0);
    return dt.toISOString();
};

export const INITIAL_ENTRIES: TimeEntry[] = [
    {
        id: 'entry-1',
        userId: 'u4',
        userName: 'Marcus Vance',
        jobId: 'j1',
        segment: '01 - Yard Prep & Loading',
        workType: 'onsite',
        start: daysAgo(1, 7),
        end: daysAgoEnd(1, 15.5),
        notes: 'Loaded trailer with 200ft conduit and rigged generator',
        lat: 37.7749,
        lng: -122.4194,
        locationFlag: null,
        supervisorStatus: 'approved',
        approvedBy: 'u2',
        approvedAt: daysAgo(1, 17),
        editHistory: [],
    },
    {
        id: 'entry-2',
        userId: 'u4',
        userName: 'Marcus Vance',
        jobId: 'j2',
        segment: '10 - Conduit & Wire Pulling',
        workType: 'field',
        start: daysAgo(0, 4),
        end: daysAgo(0, 0.5),
        notes: 'Traveled to site and ran main feeder line',
        lat: 37.7915, // slightly off site, flagged!
        lng: -122.3980,
        locationFlag: 'outside_radius',
        supervisorStatus: 'pending',
        editHistory: [],
        gpsRoute: [
            { lat: 37.7749, lng: -122.4194, timestamp: daysAgo(0, 4), speedMph: 24 },
            { lat: 37.7820, lng: -122.4100, timestamp: daysAgo(0, 3.5), speedMph: 35 },
            { lat: 37.7901, lng: -122.3995, timestamp: daysAgo(0, 3.0), speedMph: 0 },
            { lat: 37.7915, lng: -122.3980, timestamp: daysAgo(0, 0.5), speedMph: 0 },
        ],
    },
    {
        id: 'entry-3',
        userId: 'u5',
        userName: 'Carlos Rivera',
        jobId: 'j3',
        segment: '20 - Trenching & Utility Digging',
        workType: 'onsite',
        start: daysAgo(2, 8),
        end: daysAgoEnd(2, 17),
        notes: 'Dug 150m trench for high-voltage feeder cable',
        lat: 37.5630,
        lng: -122.3255,
        locationFlag: 'manual_edit',
        supervisorStatus: 'approved',
        approvedBy: 'u2',
        approvedAt: daysAgo(2, 18),
        editHistory: [
            {
                id: 'edit-101',
                editedAt: daysAgo(2, 17.5),
                editedByUserId: 'u2',
                editedByUserName: 'Marcelo Alvarez',
                previousStart: daysAgo(2, 10), // moved start back by 2 hours as demoed in Marcelo's call
                previousEnd: daysAgoEnd(2, 17),
                newStart: daysAgo(2, 8),
                newEnd: daysAgoEnd(2, 17),
                justification: 'Adjusted clock-in by 2 hours because Carlos arrived early for safety brief before cell service returned.',
            },
        ],
    },
];

export const INITIAL_PTO_REQUESTS: PTORequest[] = [
    {
        id: 'pto-1',
        userId: 'u4',
        userName: 'Marcus Vance',
        startDate: '2026-10-15',
        endDate: '2026-10-16',
        totalHours: 16,
        reason: 'Personal family obligations',
        status: 'approved',
        supervisorNotes: 'Approved by Marcelo.',
        reviewedBy: 'u2',
        reviewedAt: daysAgo(3, 10),
    },
    {
        id: 'pto-2',
        userId: 'u5',
        userName: 'Carlos Rivera',
        startDate: '2026-10-20',
        endDate: '2026-10-21',
        totalHours: 16,
        reason: 'Medical procedure & recovery',
        status: 'denied',
        supervisorNotes: 'Denied due to peak site inspection schedule on Oct 20. Must reschedule.',
        reviewedBy: 'u2',
        reviewedAt: daysAgo(1, 14),
    },
];

export const INITIAL_CONTRACTOR_LOGS: ContractorUnitLog[] = [
    {
        id: 'clog-1',
        contractorId: 'u6',
        contractorName: 'Alex "Sparks" Miller',
        companyName: 'Apex Precision Welding LLC',
        equipmentUnit: 'Lincoln Electric Yard Welder #04',
        equipmentId: 'eq1',
        start: daysAgo(1, 8),
        end: daysAgo(1, 12),
        workDescription: 'Fabricated heavy steel mounting brackets for Metro Plaza Substation transformer frame.',
        validatedBySupervisor: true,
        validationNotes: 'Brackets inspected and passed QA by Marcelo.',
    },
    {
        id: 'clog-2',
        contractorId: 'u6',
        contractorName: 'Alex "Sparks" Miller',
        companyName: 'Apex Precision Welding LLC',
        equipmentUnit: 'Miller Trailer Mobile Generator #02',
        equipmentId: 'eq3',
        start: daysAgo(1, 12.5),
        end: daysAgo(1, 17),
        workDescription: 'Switched unit mid-shift to rewire generator breaker box and weld trailer hitch mount.',
        validatedBySupervisor: true,
        validationNotes: 'Verified 4.5 hrs generator work.',
    },
    {
        id: 'clog-3',
        contractorId: 'u6',
        contractorName: 'Alex "Sparks" Miller',
        companyName: 'Apex Precision Welding LLC',
        equipmentUnit: 'CAT 320 Heavy Hydraulic Excavator #12',
        equipmentId: 'eq2',
        start: hoursAgo(5),
        end: null, // Active work!
        workDescription: 'Reinforcing bucket teeth and hard-facing excavator arm welds.',
        validatedBySupervisor: false,
    },
];
