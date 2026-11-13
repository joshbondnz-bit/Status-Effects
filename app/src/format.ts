import { PHASES, phaseIndex } from '../../engine/src/index.ts';

const pad = (n: number) => String(n).padStart(2, '0');

/** 24-hour "HH:MM". */
export function clock(t: number): string {
  const d = new Date(t);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/** "3h 05m" or "42m". */
export function duration(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return m + 'm';
  return Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm';
}

/** "$3.50", or "$12" for whole amounts. */
export function money(n: number): string {
  return '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
}

/** The zone name for a blood alcohol estimate. The app shows zones, never percentages, so nobody reads it like a breathalyser. */
export const zoneName = (bac: number) => PHASES[phaseIndex(bac)].name;
