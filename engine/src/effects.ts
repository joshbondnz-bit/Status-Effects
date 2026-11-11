// Debuffs and buffs for a night. Returns data only; wording lives in the app UI.

import { HOUR, MIN, FED_WINDOW, type Night } from './bac.ts';
import type { Severity } from './types.ts';

export type EffectId =
  | 'judgment' | 'sleep' | 'hrv' | 'dehydration' | 'hangover' | 'hangxiety'
  | 'recovery' | 'fatpause' | 'munchies' | 'strain'
  | 'hydrated' | 'lined' | 'pace' | 'called';

export interface Effect {
  id: EffectId;
  kind: 'debuff' | 'buff';
  /** When it began (or will begin, if incoming). */
  start: number;
  /** When it ends. Infinity for buffs that last while a condition holds. */
  end: number;
  status: 'active' | 'incoming' | 'ongoing';
  severity: Severity | null;
  /** Numbers the UI may want for its description. */
  data?: Record<string, number>;
  /** Still running from an earlier night: that night's first drink. (See lingering.ts.) */
  carriedFrom?: number;
  /** How many nights this debuff is stacked from (2 or more when tonight builds on an earlier night). */
  stacks?: number;
}

export interface EffectOptions {
  /** Include the food-related debuffs (fat burning paused, munchies). */
  calories: boolean;
  /** When the user ended the night, if they did. */
  endedAt?: number | null;
}

/** How long "Body under strain" lasts after reaching the critical level. */
export const STRAIN_HOURS = 48;

/** Drop in the HRV-based recovery score for early sleep, in percentage points, by intake (Pietilä et al., 2018): low, moderate, high. */
export const HRV_DROP_PCT = [9, 24, 39] as const;

export function hrvSeverity(gramsPerKg: number): Severity {
  return gramsPerKg < 0.25 ? 0 : gramsPerKg < 0.75 ? 1 : 2;
}

/** Grams still in the body at bedtime above which sleep counts as affected. */
const BED_GRAMS_THRESHOLD = 1;
/** Drinking this close to bedtime affects sleep even if the alcohol has just cleared. */
export const SLEEP_WINDOW = 3 * HOUR;
/** Overnight heart-rate recovery is affected by drinking this close to bedtime. */
export const HRV_WINDOW = 4 * HOUR;

/** Is there still alcohol in the body when you go to sleep? */
export const alcoholAtBedtime = (night: Night) => night.bedGrams > BED_GRAMS_THRESHOLD;

const drankWithin = (night: Night, window: number) => !!night.lastDrink && night.bed - night.lastDrink.t <= window;

/**
 * Sleep is only affected if alcohol is still in the body at bedtime, or the last drink was within
 * 3 hours of it. A lunchtime drink that's long gone by bedtime does nothing to tonight's sleep.
 * Returns null when sleep isn't affected.
 */
export function sleepSeverity(night: Night): Severity | null {
  if (alcoholAtBedtime(night)) {
    const byBed: Severity = night.bedBac >= 0.05 ? 2 : night.bedBac >= 0.01 ? 1 : 0;
    return Math.max(byBed, hrvSeverity(night.gramsPerKg)) as Severity;
  }
  return drankWithin(night, SLEEP_WINDOW) ? 0 : null;
}

/** Overnight HRV hit: full severity if alcohol is present at bedtime, one step milder if drinking ended within 4 hours of it. */
export function overnightHrvSeverity(night: Night): Severity | null {
  const sev = hrvSeverity(night.gramsPerKg);
  if (alcoholAtBedtime(night)) return sev;
  return drankWithin(night, HRV_WINDOW) ? (Math.max(0, sev - 1) as Severity) : null;
}

export function hangoverSeverity(peak: number): Severity | null {
  if (peak < 0.08) return null;
  return peak < 0.11 ? 0 : peak < 0.15 ? 1 : 2;
}

export function effects(night: Night, opts: EffectOptions): { debuffs: Effect[]; buffs: Effect[] } {
  const { now } = night;
  const debuffs: Effect[] = [];
  const buffs: Effect[] = [];
  const add = (list: Effect[], e: Effect) => { if (e.end > now) list.push(e); };

  if (night.firstDrink && night.lastDrink) {
    const first = night.firstDrink.t, last = night.lastDrink.t;
    // When the alcohol clears (or cleared): fixed once it has happened, so after-effects count down from it.
    const cleared = night.clearedAt ?? night.soberAt;

    // Reaching the critical level leaves the body under strain for two days. If the projection
    // says you're heading there, it shows as incoming: an early warning, not a badge.
    if (night.criticalAt != null) add(debuffs, {
      id: 'strain', kind: 'debuff', start: night.criticalAt, end: night.criticalAt + STRAIN_HOURS * HOUR,
      status: now < night.criticalAt ? 'incoming' : 'active', severity: 2,
    });

    const j = night.span(0.02);
    if (j) add(debuffs, {
      id: 'judgment', kind: 'debuff', start: j.start, end: j.end,
      status: j.active ? 'active' : 'incoming',
      severity: j.max < 0.05 ? 0 : j.max < 0.08 ? 1 : 2,
    });

    // Sleep and HRV only apply when drinking reaches into the night, and they start at bedtime.
    const ss = sleepSeverity(night);
    if (ss != null) add(debuffs, {
      id: 'sleep', kind: 'debuff', start: night.bed, end: night.wake,
      status: now < night.bed ? 'incoming' : 'active',
      severity: ss, data: { bedGrams: night.bedGrams, bedBac: night.bedBac },
    });

    const hs = overnightHrvSeverity(night);
    if (hs != null) add(debuffs, {
      id: 'hrv', kind: 'debuff', start: night.bed, end: night.wake + [1, 6, 12][hs] * HOUR,
      status: now < night.bed ? 'incoming' : 'active',
      severity: hs, data: { dropPct: HRV_DROP_PCT[hs], gramsPerKg: night.gramsPerKg },
    });

    const deficit = Math.max(0, night.drinks.length - night.waters.length);
    add(debuffs, {
      id: 'dehydration', kind: 'debuff', start: first, end: cleared + deficit * 45 * MIN, status: 'active',
      severity: deficit === 0 ? 0 : deficit <= 2 ? 1 : 2,
      data: { drinks: night.drinks.length, waters: night.waters.length },
    });

    const hang = hangoverSeverity(night.peak);
    if (hang != null) {
      const s = cleared;
      add(debuffs, {
        id: 'hangover', kind: 'debuff', start: s, end: s + [10, 16, 24][hang] * HOUR,
        status: now < s ? 'incoming' : 'active', severity: hang, data: { peak: night.peak },
      });
      add(debuffs, {
        id: 'hangxiety', kind: 'debuff', start: s, end: s + 18 * HOUR,
        status: now < s ? 'incoming' : 'active', severity: night.peak >= 0.11 ? 1 : 0,
      });
    }

    if (night.gramsPerKg >= 0.5) {
      const heavy = night.gramsPerKg >= 1;
      add(debuffs, {
        id: 'recovery', kind: 'debuff', start: last, end: last + (heavy ? 48 : 24) * HOUR,
        status: 'active', severity: heavy ? 2 : 1,
      });
    }

    if (opts.calories) {
      if (night.soberAt > now || night.bacNow > 0) add(debuffs, {
        id: 'fatpause', kind: 'debuff', start: first, end: cleared, status: 'active', severity: null,
        data: { pausedMs: cleared - first },
      });
      const m = night.span(0.04);
      if (m && m.active) add(debuffs, {
        id: 'munchies', kind: 'debuff', start: m.start, end: m.end, status: 'active', severity: null,
      });
    }
  }

  const lastWater = night.waters[night.waters.length - 1];
  if (lastWater) add(buffs, { id: 'hydrated', kind: 'buff', start: lastWater.t, end: lastWater.t + 60 * MIN, status: 'active', severity: null });

  const lastFood = night.foods[night.foods.length - 1];
  if (lastFood) add(buffs, { id: 'lined', kind: 'buff', start: lastFood.t, end: lastFood.t + FED_WINDOW, status: 'active', severity: null });

  if (night.lastDrink && !opts.endedAt && now - night.lastDrink.t >= 45 * MIN && now < night.wake) {
    buffs.push({
      id: 'pace', kind: 'buff', start: night.lastDrink.t, end: Infinity, status: 'ongoing', severity: null,
      data: { gramsClearedPerHour: night.body.eliminationGPerMin * 60 },
    });
  }

  if (opts.endedAt && opts.endedAt < night.bed) {
    add(buffs, { id: 'called', kind: 'buff', start: opts.endedAt, end: night.wake, status: 'active', severity: null });
  }

  // Active first, most severe first; incoming last.
  const rank = (e: Effect) => (e.status === 'incoming' ? 10 : 0) - (e.severity ?? 0);
  debuffs.sort((a, b) => rank(a) - rank(b));
  return { debuffs, buffs };
}
