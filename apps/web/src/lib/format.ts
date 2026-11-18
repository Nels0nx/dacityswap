const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const eurCompact = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 2,
});
const integer = new Intl.NumberFormat('en-IE');
const compact = new Intl.NumberFormat('en-IE', { notation: 'compact', maximumFractionDigits: 1 });

export const formatEUR = (minor: number) => eur.format(minor / 100);
export const formatEURCompact = (minor: number) => eurCompact.format(minor / 100);
export const formatInt = (value: number) => integer.format(value);
export const formatCompact = (value: number) => compact.format(value);

export function formatDelivery(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const hours = minutes / 60;
  return `~${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const minutes = Math.floor((s % 3_600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return days > 0
    ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}
