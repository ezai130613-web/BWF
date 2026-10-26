/** Display helpers. All BWF dates are shown in IST, like the website. */

const IST = 'Asia/Kolkata';

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: IST,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function dayAndMonth(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric' }),
    month: d.toLocaleDateString('en-IN', { timeZone: IST, month: 'short' }).toUpperCase(),
  };
}

export function formatInr(value: number | string) {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '₹0';
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatDistance(km: number) {
  return km < 1 ? `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m away` : `${km.toFixed(1)} km away`;
}

/** Today's date in IST as YYYY-MM-DD. */
export function todayIst() {
  return new Date().toLocaleDateString('en-CA', { timeZone: IST });
}
