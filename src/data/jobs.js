// data/jobs.js
export const JOBS = [
    { id: 'j1', name: 'Harbor St. Remodel',  address: '214 Harbor St',   color: '#F97316', lat: 37.7749, lng: -122.4194, radius: 300 },
    { id: 'j2', name: 'Pine Ridge Roofing',  address: '88 Pine Ridge Rd', color: '#22C55E', lat: 37.7849, lng: -122.4094, radius: 300 },
    { id: 'j3', name: 'Oak Ave Solar',        address: '1502 Oak Ave',     color: '#3B82F6', lat: 37.7649, lng: -122.4294, radius: 300 },
    { id: 'j4', name: 'Shop / Yard',          address: 'Main yard',        color: '#8B5CF6', lat: 37.7549, lng: -122.4394, radius: 500 },
];

export const TASKS = [
    { id: 't1', name: 'Demo' },
    { id: 't2', name: 'Framing' },
    { id: 't3', name: 'Drywall' },
];

// Entry shape:
// { id, jobId, taskId, workType: 'onsite'|'field', start, end, notes,
//   locationFlag: null|'outside_radius'|'gps_denied',
//   supervisorStatus: 'pending'|'approved'|'rejected',
//   lat, lng }