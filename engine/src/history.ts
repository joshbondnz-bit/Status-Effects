// Summaries of past nights and totals over a week, month or year.

import { HOUR, simulateNight } from './bac.ts';
import { addDays, dayKey, keyToTime, nightOf, startOfDay } from './calendar.ts';
import { guessCategory } from './drinks.ts';
import { effects } from './effects.ts';
import type { DrinkCategory, LogEvent, Profile } from './types.ts';

export interface NightSummary {
  /** The night it belongs to ("YYYY-MM-DD"; drinks before 6 am count as the previous evening). */
  day: string;
  /** First drink. */
  start: number;
  /** When the last debuff from this night ends. */
  debuffEnd: number;
  drinks: number;
  grams: number;
  kcal: number;
  peak: number;
  /** Grams still in the body at bedtime. */
  bedGrams: number;
  /** Hours of sleep with alcohol still in the body. */
  sleepHoursAffected: number;
  waters: number;
  /** From first drink to 45 min after the last, in hours (for drinks-per-hour pace). */
  spanHours: number;
  /** Grams of alcohol by drink type. */
  mix: Record<DrinkCategory, number>;
}

/** Summarise one night's log, or null if it has no drinks. */
export function summarizeNight(profile: Profile, events: LogEvent[]): NightSummary | null {
  const drinks = events.filter(e => e.type === 'drink');
  if (!drinks.length) return null;
  const first = Math.min(...drinks.map(d => d.t));
  const last = Math.max(...drinks.map(d => d.t));
  const night = simulateNight({ profile, events, now: first });
  const fx = effects(night, { calories: false });
  const debuffEnd = Math.max(first, ...fx.debuffs.map(e => e.end).filter(Number.isFinite));
  const mix: Record<DrinkCategory, number> = { beer: 0, wine: 0, spirits: 0, mixed: 0 };
  for (const d of drinks) mix[d.category ?? guessCategory(d.name)] += d.grams;
  return {
    day: nightOf(first),
    start: first,
    debuffEnd,
    drinks: drinks.length,
    grams: night.totalGrams,
    kcal: night.kcal,
    peak: night.peak,
    bedGrams: night.bedGrams,
    sleepHoursAffected: night.clearedAt ? Math.max(0, Math.min(night.clearedAt, night.wake) - night.bed) / HOUR : 0,
    waters: events.filter(e => e.type === 'water').length,
    spanHours: (last - first) / HOUR + 0.75,
    mix,
  };
}

/** Index summaries by night. If two logs land on the same night, they're combined. */
export function byNight(summaries: NightSummary[]): Map<string, NightSummary> {
  const map = new Map<string, NightSummary>();
  for (const s of summaries) {
    const prev = map.get(s.day);
    if (!prev) { map.set(s.day, s); continue; }
    map.set(s.day, {
      ...prev,
      start: Math.min(prev.start, s.start), debuffEnd: Math.max(prev.debuffEnd, s.debuffEnd),
      drinks: prev.drinks + s.drinks, grams: prev.grams + s.grams, kcal: prev.kcal + s.kcal,
      peak: Math.max(prev.peak, s.peak), bedGrams: Math.max(prev.bedGrams, s.bedGrams),
      sleepHoursAffected: Math.max(prev.sleepHoursAffected, s.sleepHoursAffected),
      waters: prev.waters + s.waters, spanHours: prev.spanHours + s.spanHours,
      mix: { beer: prev.mix.beer + s.mix.beer, wine: prev.mix.wine + s.mix.wine, spirits: prev.mix.spirits + s.mix.spirits, mixed: prev.mix.mixed + s.mix.mixed },
    });
  }
  return map;
}

export interface PeriodStats {
  /** Days with data in the range (days before tracking began, or still to come, aren't counted). */
  days: number;
  dryDays: number;
  nights: NightSummary[];
  grams: number;
  kcal: number;
  drinks: number;
  waters: number;
  /** Nights that reached 0.08% or more. */
  heavyNights: number;
  /** Hours with at least one debuff running (overlapping nights counted once). */
  debuffHours: number;
  /** Nights that went to bed with alcohol still in the body. */
  sleepAffectedNights: number;
  sleepHoursAffected: number;
  spanHours: number;
  mix: Record<DrinkCategory, number>;
  /** Grams by weekday, Monday first. */
  gramsByWeekday: number[];
}

/**
 * Totals for the days from `start` to `end` (inclusive), counting only days between
 * `trackingStart` and `today`.
 */
export function periodStats(nights: Map<string, NightSummary>, start: number, end: number, trackingStart: number, today: number): PeriodStats {
  const st: PeriodStats = {
    days: 0, dryDays: 0, nights: [], grams: 0, kcal: 0, drinks: 0, waters: 0, heavyNights: 0, debuffHours: 0,
    sleepAffectedNights: 0, sleepHoursAffected: 0, spanHours: 0, mix: { beer: 0, wine: 0, spirits: 0, mixed: 0 }, gramsByWeekday: [0, 0, 0, 0, 0, 0, 0],
  };
  const from = Math.max(startOfDay(start), startOfDay(trackingStart));
  const to = Math.min(startOfDay(end), startOfDay(today));
  for (let t = from; t <= to; t = addDays(t, 1)) {
    st.days++;
    const n = nights.get(dayKey(t));
    if (!n) { st.dryDays++; continue; }
    st.nights.push(n);
    st.grams += n.grams; st.kcal += n.kcal; st.drinks += n.drinks; st.waters += n.waters; st.spanHours += n.spanHours;
    if (n.peak >= 0.08) st.heavyNights++;
    if (n.bedGrams > 1) st.sleepAffectedNights++;
    st.sleepHoursAffected += n.sleepHoursAffected;
    for (const k of Object.keys(st.mix) as DrinkCategory[]) st.mix[k] += n.mix[k];
    st.gramsByWeekday[(new Date(keyToTime(n.day)).getDay() + 6) % 7] += n.grams;
  }
  // Union of each night's debuff window, so a 48-hour recovery debuff overlapping the next night isn't double-counted.
  const spans = st.nights.map(n => [n.start, n.debuffEnd] as const).sort((a, b) => a[0] - b[0]);
  let s0: number | null = null, e0 = 0;
  for (const [s, e] of spans) {
    if (s0 == null || s > e0) { if (s0 != null) st.debuffHours += (e0 - s0) / HOUR; s0 = s; e0 = e; } else e0 = Math.max(e0, e);
  }
  if (s0 != null) st.debuffHours += (e0 - s0) / HOUR;
  return st;
}

/** Alcohol-free streaks: the current one (ending today) and the longest since tracking began. */
export function dryStreaks(nights: Map<string, NightSummary>, trackingStart: number, today: number): { current: number; longest: number } {
  let current = 0;
  for (let t = startOfDay(today); t >= startOfDay(trackingStart) && !nights.has(dayKey(t)); t = addDays(t, -1)) current++;
  let longest = 0, run = 0;
  for (let t = startOfDay(trackingStart); t <= startOfDay(today); t = addDays(t, 1)) {
    if (nights.has(dayKey(t))) run = 0; else { run++; longest = Math.max(longest, run); }
  }
  return { current, longest };
}
