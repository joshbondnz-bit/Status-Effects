// Export your history as CSV (opens in Numbers, Excel or Google Sheets).
// Two tables: every logged entry, and one row per night with its totals.

import { standardDrinks } from './drinks.ts';
import { nightOf } from './calendar.ts';
import { FEELS } from './feel.ts';
import { hpFromBac } from './hp.ts';
import { summarizeNight } from './history.ts';
import type { LogEvent, Profile, RegionCode } from './types.ts';

/** A night as saved: its log and the morning check-in (0 great … 4 wrecked), if answered. */
export interface ExportNight { events: LogEvent[]; feel?: number }

/** One CSV field: quoted when it holds a comma, quote or line break. */
function field(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const row = (cells: (string | number | null | undefined)[]) => cells.map(field).join(',');
const pad = (n: number) => String(n).padStart(2, '0');
const date = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const time = (t: number) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const feelWord = (f?: number) => (f == null ? '' : FEELS[f] ?? '');

/** Every drink, water and food logged, oldest first. "Night" is the evening it belongs to (drinks after midnight count as the night before). */
export function entriesCsv(nights: ExportNight[], region: RegionCode): string {
  const lines = [row(['night', 'date', 'time', 'type', 'name', 'size', 'volume_ml', 'abv_percent', 'standard_drinks', 'alcohol_g', 'kcal', 'price', 'morning_feel'])];
  const all = nights.flatMap(n => n.events.map(e => ({ e, feel: n.feel }))).sort((a, b) => a.e.t - b.e.t);
  for (const { e, feel } of all) {
    if (e.type === 'drink') {
      lines.push(row([nightOf(e.t), date(e.t), time(e.t), 'drink', e.name, e.size, e.ml, e.abv, r2(standardDrinks(e.grams, region)), r1(e.grams), e.kcal, e.cost != null ? r2(e.cost) : null, feelWord(feel)]));
    } else {
      lines.push(row([nightOf(e.t), date(e.t), time(e.t), e.type, e.type === 'water' ? 'Water' : 'Food', null, null, null, null, null, null, null, feelWord(feel)]));
    }
  }
  return lines.join('\r\n') + '\r\n';
}

/** One row per night with drinks: totals, peak blood alcohol, lowest HP, money, sleep and the morning check-in. */
export function nightsCsv(profile: Profile, nights: ExportNight[]): string {
  const lines = [row(['night', 'first_drink', 'last_drink', 'drinks', 'standard_drinks', 'peak_bac_percent', 'lowest_hp', 'water', 'food', 'kcal', 'spent', 'sleep_hours_with_alcohol', 'morning_feel'])];
  const rows = nights
    .map(n => ({ n, s: summarizeNight(profile, n.events) }))
    .filter((x): x is { n: ExportNight; s: NonNullable<ReturnType<typeof summarizeNight>> } => x.s != null)
    .sort((a, b) => a.s.start - b.s.start);
  for (const { n, s } of rows) {
    const drinks = n.events.filter(e => e.type === 'drink');
    const last = Math.max(...drinks.map(e => e.t));
    const spent = drinks.reduce((t, e) => t + (e.type === 'drink' ? e.cost ?? 0 : 0), 0);
    const priced = drinks.some(e => e.type === 'drink' && e.cost != null);
    lines.push(row([s.day, time(s.start), time(last), s.drinks, r2(standardDrinks(s.grams, profile.region)), s.peak.toFixed(3),
      s.critical ? 0 : Math.round(hpFromBac(s.peak)), s.waters, n.events.filter(e => e.type === 'food').length, s.kcal,
      priced ? r2(spent) : null, r1(s.sleepHoursAffected), feelWord(n.feel)]));
  }
  return lines.join('\r\n') + '\r\n';
}
