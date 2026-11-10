// The blood alcohol model.
//
// Each drink lands in a "stomach" pool and moves into the blood at a steady
// fraction per minute (first-order absorption). Food slows that and lowers how
// much reaches the blood. The liver clears a fixed amount per hour (zero-order
// elimination). Blood alcohol = grams in the body / distribution volume.

import type { DrinkEvent, FoodEvent, LogEvent, Profile, WaterEvent } from './types.ts';

export const MIN = 60_000;
export const HOUR = 60 * MIN;

/** Elimination rate, % BAC per hour. Population average; real range ~0.010–0.025. */
export const ELIMINATION_PER_HOUR = 0.015;
/** Share of the stomach pool absorbed per minute: empty stomach vs. after food. */
export const ABSORPTION_EMPTY = 0.08;
export const ABSORPTION_FED = 0.03;
/** Food eaten within this window counts as "fed". */
export const FED_WINDOW = 180 * MIN;
/** Share of a drink that reaches the blood when fed (first-pass effect). */
export const FED_BIOAVAILABILITY = 0.85;
/** If someone drinks past their usual bedtime, assume they sleep this long after the last drink. */
export const AFTER_LAST_DRINK = 15 * MIN;
/** Never treat a night's sleep as shorter than this when bedtime gets pushed late. */
const MIN_SLEEP = 4 * HOUR;
/** Blood is about 80.6% water. */
const BLOOD_WATER_FRACTION = 0.806;

/** Total body water in litres (Watson et al., 1980). */
export function totalBodyWater(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const tbw = p.sex === 'm'
    ? 2.447 - 0.09516 * p.age + 0.1074 * p.heightCm + 0.3362 * p.weightKg
    : -2.097 + 0.1069 * p.heightCm + 0.2466 * p.weightKg;
  return Math.max(10, tbw);
}

export interface BodyModel {
  totalBodyWaterL: number;
  /** Volume alcohol spreads through, in decilitres (so grams / volume = % BAC). */
  volumeDl: number;
  /** Grams the liver clears per minute. */
  eliminationGPerMin: number;
}

export function bodyModel(p: Profile): BodyModel {
  const tbw = totalBodyWater(p);
  const volumeDl = (tbw / BLOOD_WATER_FRACTION) * 10;
  return { totalBodyWaterL: tbw, volumeDl, eliminationGPerMin: (ELIMINATION_PER_HOUR / 60) * volumeDl };
}

function hm(s: string): [number, number] {
  const [h, m] = s.split(':').map(Number);
  return [h || 0, m || 0];
}

/**
 * The usual bedtime and wake time for the night that starts around `anchor`.
 * Bedtime is the first one at or after (anchor − 6 h), so a first drink at 12:30 am still
 * belongs to the bedtime that just passed, not tomorrow night's.
 */
export function nightWindow(p: Profile, anchor: number): { bed: number; wake: number } {
  const [bh, bm] = hm(p.bedtime);
  const [wh, wm] = hm(p.wakeTime);
  const earliest = anchor - 6 * HOUR;
  const bed = new Date(earliest);
  bed.setHours(bh, bm, 0, 0);
  if (bed.getTime() < earliest) bed.setDate(bed.getDate() + 1);
  const wake = new Date(bed);
  wake.setHours(wh, wm, 0, 0);
  if (wake <= bed) wake.setDate(wake.getDate() + 1);
  return { bed: bed.getTime(), wake: wake.getTime() };
}

export interface Span {
  /** When BAC first reached the threshold (may be in the past). */
  start: number;
  /** When BAC drops back below it. */
  end: number;
  /** True if BAC is at or above the threshold right now. */
  active: boolean;
  /** Highest BAC inside the span. */
  max: number;
}

export interface Night {
  profile: Profile;
  body: BodyModel;
  now: number;
  /** Start of the simulation (first event, rounded down to the minute). */
  t0: number;
  /** BAC (%) for each minute from t0, past and projected. */
  samples: number[];
  drinks: DrinkEvent[];
  foods: FoodEvent[];
  waters: WaterEvent[];
  /** When sleep starts: the usual bedtime, or just after the last drink if that's later. */
  bed: number;
  wake: number;
  bacNow: number;
  /** Grams still in the stomach right now (not yet absorbed). */
  stomachNow: number;
  /** Highest BAC of the night, past or projected. */
  peak: number;
  peakAt: number;
  /** Highest BAC from now on (equals bacNow when already falling). */
  futurePeak: number;
  futurePeakAt: number;
  /** When alcohol is fully cleared (past or projected), or null if none was drunk. */
  clearedAt: number | null;
  /** clearedAt if it's still ahead, otherwise now. */
  soberAt: number;
  bedBac: number;
  /** Grams of alcohol still in the body at bedtime. */
  bedGrams: number;
  totalGrams: number;
  gramsPerKg: number;
  kcal: number;
  kcalFromAlcohol: number;
  firstDrink: DrinkEvent | null;
  lastDrink: DrinkEvent | null;
  /** BAC at any time inside the simulated range (0 outside it). */
  bacAt(t: number): number;
  /** The stretch at or after `now` where BAC is at or above `threshold`, or null. */
  span(threshold: number): Span | null;
}

export interface SimulateInput {
  profile: Profile;
  events: LogEvent[];
  now: number;
  /** Safety cap on how far ahead to project. Default 48 hours. */
  maxHorizonHours?: number;
}

export function simulateNight({ profile, events: input, now, maxHorizonHours = 48 }: SimulateInput): Night {
  const body = bodyModel(profile);
  const events = [...input].sort((a, b) => a.t - b.t);
  const drinks = events.filter((e): e is DrinkEvent => e.type === 'drink');
  const foods = events.filter((e): e is FoodEvent => e.type === 'food');
  const waters = events.filter((e): e is WaterEvent => e.type === 'water');
  const foodTimes = foods.map(f => f.t);
  const fed = (t: number) => foodTimes.some(f => f <= t && t - f < FED_WINDOW);

  const start = events.length ? Math.min(events[0].t, now) : now;
  const t0 = Math.floor(start / MIN) * MIN;
  const usual = nightWindow(profile, drinks.length ? drinks[0].t : start);
  // You can't be asleep while still drinking: bedtime is the usual one, or shortly after the last drink.
  const lastDrinkT = drinks.length ? drinks[drinks.length - 1].t : -Infinity;
  const bed = Math.max(usual.bed, lastDrinkT + AFTER_LAST_DRINK);
  const wake = Math.max(usual.wake, bed + MIN_SLEEP);
  const nowIdx = Math.max(0, Math.floor((now - t0) / MIN));
  const cap = Math.max(now, t0) + maxHorizonHours * HOUR;

  const samples: number[] = [];
  let stomach = 0, bodyG = 0, next = 0, stomachNow = 0;
  for (let t = t0; ; t += MIN) {
    while (next < drinks.length && drinks[next].t <= t) {
      stomach += drinks[next].grams * (fed(drinks[next].t) ? FED_BIOAVAILABILITY : 1);
      next++;
    }
    const absorbed = stomach * (fed(t) ? ABSORPTION_FED : ABSORPTION_EMPTY);
    stomach -= absorbed;
    bodyG = Math.max(0, bodyG + absorbed - body.eliminationGPerMin);
    samples.push(bodyG / body.volumeDl);
    if (samples.length - 1 === nowIdx) stomachNow = stomach;
    const done = t >= now && next >= drinks.length && stomach < 0.05 && bodyG <= 0 && t >= bed;
    if (done || t > cap) break;
  }

  const timeOf = (k: number) => t0 + k * MIN;
  const bacAt = (t: number) => {
    const k = Math.round((t - t0) / MIN);
    return k < 0 || k >= samples.length ? 0 : samples[k];
  };
  const bacNow = samples[Math.min(nowIdx, samples.length - 1)] ?? 0;

  let peak = 0, peakAt = t0, futurePeak = bacNow, futurePeakAt = now;
  samples.forEach((b, k) => {
    if (b > peak) { peak = b; peakAt = timeOf(k); }
    if (k >= nowIdx && b > futurePeak) { futurePeak = b; futurePeakAt = timeOf(k); }
  });

  let lastPositive = -1;
  for (let k = samples.length - 1; k >= 0; k--) if (samples[k] > 1e-4) { lastPositive = k; break; }
  const clearedAt = lastPositive >= 0 ? timeOf(lastPositive + 1) : null;

  function span(threshold: number): Span | null {
    let k = nowIdx;
    while (k < samples.length && samples[k] < threshold) k++;
    if (k >= samples.length) return null;
    let s = k, max = 0;
    while (s > 0 && samples[s - 1] >= threshold) s--;
    let e = k;
    while (e < samples.length && samples[e] >= threshold) { max = Math.max(max, samples[e]); e++; }
    return { start: timeOf(s), end: timeOf(e), active: k === nowIdx, max };
  }

  const totalGrams = drinks.reduce((s, d) => s + d.grams, 0);
  const bedBac = bacAt(bed);
  return {
    profile, body, now, t0, samples, drinks, foods, waters, bed, wake,
    bacNow, stomachNow, peak, peakAt, futurePeak, futurePeakAt, clearedAt,
    soberAt: clearedAt && clearedAt > now ? clearedAt : now,
    bedBac, bedGrams: bedBac * body.volumeDl,
    totalGrams, gramsPerKg: totalGrams / profile.weightKg,
    kcal: drinks.reduce((s, d) => s + d.kcal, 0),
    kcalFromAlcohol: drinks.reduce((s, d) => s + d.kcalFromAlcohol, 0),
    firstDrink: drinks[0] ?? null,
    lastDrink: drinks[drinks.length - 1] ?? null,
    bacAt, span,
  };
}
