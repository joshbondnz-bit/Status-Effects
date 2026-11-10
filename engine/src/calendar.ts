// Calendar helpers in local time. Days are identified by "YYYY-MM-DD" keys.

import { HOUR } from './bac.ts';

export type Period = 'week' | 'month' | 'year';

const pad = (n: number) => String(n).padStart(2, '0');

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Calendar-aware: adding 1 day across a daylight-saving change still lands on midnight. */
export function addDays(t: number, n: number): number {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function keyToTime(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Monday of the week containing t, at midnight. */
export function startOfWeek(t: number): number {
  const s = startOfDay(t);
  return addDays(s, -((new Date(s).getDay() + 6) % 7));
}

/** Number of calendar days from a to b, counting both ends. */
export function daysInclusive(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / (24 * HOUR)) + 1;
}

/** The week, month or year containing t: first and last day (both at midnight). */
export function periodRange(period: Period, t: number): { start: number; end: number } {
  const d = new Date(t);
  if (period === 'week') { const start = startOfWeek(t); return { start, end: addDays(start, 6) }; }
  if (period === 'month') return { start: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), end: new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime() };
  return { start: new Date(d.getFullYear(), 0, 1).getTime(), end: new Date(d.getFullYear(), 11, 31).getTime() };
}

/** The first day of the previous (dir = -1) or next (dir = 1) week, month or year. */
export function stepPeriod(period: Period, t: number, dir: -1 | 1): number {
  const d = new Date(periodRange(period, t).start);
  if (period === 'week') return addDays(d.getTime(), 7 * dir);
  if (period === 'month') return new Date(d.getFullYear(), d.getMonth() + dir, 1).getTime();
  return new Date(d.getFullYear() + dir, 0, 1).getTime();
}

/**
 * Which night a drink belongs to. Anything before 6 am counts as the previous evening,
 * so a 12:30 am drink lands on Friday night, not Saturday.
 */
export const nightOf = (t: number): string => dayKey(t - 6 * HOUR);
