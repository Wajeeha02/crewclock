// utils/time.ts
export const diffMs = (start: string | Date, end: string | Date = new Date()): number =>
    new Date(end).getTime() - new Date(start).getTime();

export const formatHMS = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
};

export const hoursDecimal = (ms: number): string => (ms / 3600000).toFixed(2);

export const dayKey = (iso: string): string => new Date(iso).toLocaleDateString();
