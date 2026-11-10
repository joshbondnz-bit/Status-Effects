// Summaries of past nights and totals over a week, month or year.

import { HOUR, simulateNight } from './bac.ts';
import { addDays, dayKey, keyToTime, nightOf, startOfDay } from './calendar.ts';
import { guessCategory } from './drinks.ts';
import { effects, HRV_DROP_PCT, overnightHrvSeverity } from './effects.ts';
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
  /** Estimated drop in overnight HRV recovery (%), or null if this night's drinking didn't reach bedtime. */
  hrvDropPct: number | null;
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
  const hrv = overnightHrvSeverity(night);
  return {
    hrvDropPct: hrv == null ? null : HRV_DROP_PCT[hrv],
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
      hrvDropPct: prev.hrvDropPct == null ? s.hrvDropPct : s.hrvDropPct == null ? prev.hrvDropPct : Math.max(prev.hrvDropPct, s.hrvDropPct),
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

export type AchievementId = 'dryWeek' | 'weekendOff' | 'underTheLine' | 'hydrated' | 'clearByBedtime' | 'steadyHand';

export interface Achievement {
  id: AchievementId;
  earned: boolean;
  /** Progress toward the goal, in the goal's own units (days, weeks, nights, drinks per water…). */
  current: number;
  target: number;
}

/**
 * Achievements reward good choices only, never volume.
 * - dryWeek: 7 alcohol-free days in a row
 * - weekendOff: a Friday, Saturday and Sunday all alcohol-free
 * - underTheLine: 4 full Monday–Sunday weeks in a row at or under the weekly guideline
 * - hydrated: in the last 30 days, at least 1 water for every 2 drinks
 * - clearByBedtime: 5 drinking nights in a row with alcohol cleared by bedtime
 * - steadyHand: in the last 30 days, an average pace of 1 drink an hour or slower
 */
export function achievements(nights: Map<string, NightSummary>, trackingStart: number, today: number, weeklyGuideGrams: number): Achievement[] {
  const t0 = startOfDay(trackingStart), t1 = startOfDay(today);
  const has = (t: number) => nights.has(dayKey(t));

  const streaks = dryStreaks(nights, t0, t1);

  let weekendOff = false;
  for (let t = t0; addDays(t, 2) <= t1 && !weekendOff; t = addDays(t, 1)) {
    if (new Date(t).getDay() === 5 && !has(t) && !has(addDays(t, 1)) && !has(addDays(t, 2))) weekendOff = true;
  }

  let run = 0, bestWeeks = 0;
  let w = addDays(t0, (8 - new Date(t0).getDay()) % 7); // first full week starts on a Monday on/after tracking
  for (; addDays(w, 6) < t1; w = addDays(w, 7)) {
    let g = 0;
    for (let i = 0; i < 7; i++) g += nights.get(dayKey(addDays(w, i)))?.grams ?? 0;
    if (g <= weeklyGuideGrams) { run++; bestWeeks = Math.max(bestWeeks, run); } else run = 0;
  }

  const ordered = [...nights.values()].sort((a, b) => a.start - b.start);
  let clearRun = 0, bestClear = 0;
  for (const n of ordered) { if (n.bedGrams <= 1) { clearRun++; bestClear = Math.max(bestClear, clearRun); } else clearRun = 0; }

  const last30 = periodStats(nights, addDays(t1, -29), t1, t0, t1);
  const drinksPerWater = last30.waters ? last30.drinks / last30.waters : Infinity;
  const pace = last30.spanHours ? last30.drinks / last30.spanHours : 0;

  return [
    { id: 'dryWeek', earned: streaks.longest >= 7, current: streaks.longest, target: 7 },
    { id: 'weekendOff', earned: weekendOff, current: weekendOff ? 1 : 0, target: 1 },
    { id: 'underTheLine', earned: bestWeeks >= 4, current: bestWeeks, target: 4 },
    { id: 'hydrated', earned: last30.drinks > 0 && drinksPerWater <= 2, current: drinksPerWater, target: 2 },
    { id: 'clearByBedtime', earned: bestClear >= 5, current: bestClear, target: 5 },
    { id: 'steadyHand', earned: last30.drinks > 0 && pace <= 1, current: pace, target: 1 },
  ];
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
