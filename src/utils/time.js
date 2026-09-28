// utils/time.js
export const diffMs = (start, end = new Date()) =>
    new Date(end) - new Date(start);

export const formatHMS = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
};

export const hoursDecimal = (ms) => (ms / 3600000).toFixed(2);

export const dayKey = (iso) => new Date(iso).toLocaleDateString();