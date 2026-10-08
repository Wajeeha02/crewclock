import type { TimeEntry, UserProfile } from '../types';
import { diffMs } from './time';

export function calculatePayroll(entries: TimeEntry[], users: UserProfile[]) {
    // 1. Filter only completed and approved entries
    const validEntries = entries.filter(e => e.end && e.supervisorStatus === 'approved' && e.jobId !== 'break');

    // 2. Group by User
    const userMap: Record<string, any> = {};

    users.forEach(u => {
        if (u.role === 'contractor') return;
        userMap[u.id] = {
            id: u.id,
            name: u.name,
            role: u.role,
            hourlyRate: u.hourlyRate || 0,
            entries: [] as TimeEntry[],
            totalMs: 0,
            regularHours: 0,
            overtimeHours: 0,
            doubleTimeHours: 0,
            totalPay: 0
        };
    });

    validEntries.forEach(e => {
        if (userMap[e.userId]) {
            userMap[e.userId].entries.push(e);
            userMap[e.userId].totalMs += diffMs(e.start, e.end!);
        }
    });

    // 3. Calculate Overtime (Standard Rules + Daily Rules like CA)
    // Daily Rule: >8hrs is OT, >12hrs is DT. Weekly: >40hrs REGULAR is OT
    Object.values(userMap).forEach(uData => {
        const dailyMs: Record<string, number> = {};
        uData.entries.forEach((e: TimeEntry) => {
            const dateStr = new Date(e.start).toLocaleDateString();
            if (!dailyMs[dateStr]) dailyMs[dateStr] = 0;
            dailyMs[dateStr] += diffMs(e.start, e.end!);
        });

        Object.values(dailyMs).forEach(ms => {
            const hours = ms / (1000 * 60 * 60);
            let reg = 0;
            let ot = 0;
            let dt = 0;

            if (hours > 12) {
                reg = 8;
                ot = 4;
                dt = hours - 12;
            } else if (hours > 8) {
                reg = 8;
                ot = hours - 8;
            } else {
                reg = hours;
            }

            uData.regularHours += reg;
            uData.overtimeHours += ot;
            uData.doubleTimeHours += dt;
        });
        
        // Also apply weekly OT if total regular exceeds 40
        if (uData.regularHours > 40) {
            const diff = uData.regularHours - 40;
            uData.regularHours = 40;
            uData.overtimeHours += diff;
        }

        // Calculate Pay
        const rate = uData.hourlyRate;
        uData.totalPay = (uData.regularHours * rate) + (uData.overtimeHours * rate * 1.5) + (uData.doubleTimeHours * rate * 2);
    });

    return Object.values(userMap).filter(u => u.totalMs > 0);
}

export function generatePayrollCSV(entries: TimeEntry[], users: UserProfile[]) {
    const payrollData = calculatePayroll(entries, users);
    
    if (payrollData.length === 0) {
        alert("No approved hours to export!");
        return;
    }
    
    // Headers matching Quickbooks/ADP import formats
    const headers = [
        "Employee Name",
        "Role",
        "Hourly Rate",
        "Total Hours",
        "Regular Hours",
        "Overtime Hours (1.5x)",
        "Double Time Hours (2.0x)",
        "Gross Pay"
    ];

    const rows = payrollData.map(u => [
        `"${u.name}"`,
        `"${u.role}"`,
        u.hourlyRate.toFixed(2),
        (u.totalMs / (1000 * 60 * 60)).toFixed(2),
        u.regularHours.toFixed(2),
        u.overtimeHours.toFixed(2),
        u.doubleTimeHours.toFixed(2),
        u.totalPay.toFixed(2)
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    // Download logic
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payroll_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
