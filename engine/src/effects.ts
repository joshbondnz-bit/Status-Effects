// Debuffs and buffs for a night. Returns data only; wording lives in the app UI.

import { HOUR, MIN, FED_WINDOW, type Night } from './bac.ts';
import type { Severity } from './types.ts';

export type EffectId =
  | 'judgment' | 'sleep' | 'hrv' | 'dehydration' | 'hangover' | 'hangxiety'
  | 'recovery' | 'fatpause' | 'munchies'
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
}

export interface EffectOptions {
  /** Include the food-related debuffs (fat burning paused, munchies). */
  calories: boolean;
  /** When the user ended the night, if they did. */
  endedAt?: number | null;
}

/** Drop in overnight HRV recovery by intake (Pietilä et al., 2018): low, moderate, high. */
export const HRV_DROP_PCT = [9, 24, 39] as const;

export function hrvSeverity(gramsPerKg: number): Severity {
  return gramsPerKg < 0.25 ? 0 : gramsPerKg < 0.75 ? 1 : 2;
}

export function sleepSeverity(night: Night): Severity {
  const byDose = hrvSeverity(night.gramsPerKg);
  const byBed: Severity = night.bedBac >= 0.05 ? 2 : night.bedBac >= 0.01 ? 1 : 0;
  return Math.max(byDose, byBed) as Severity;
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

    const j = night.span(0.02);
    if (j) add(debuffs, {
      id: 'judgment', kind: 'debuff', start: j.start, end: j.end,
      status: j.active ? 'active' : 'incoming',
      severity: j.max < 0.05 ? 0 : j.max < 0.08 ? 1 : 2,
    });

    if (now < night.wake) add(debuffs, {
      id: 'sleep', kind: 'debuff', start: first, end: night.wake, status: 'active',
      severity: sleepSeverity(night), data: { bedGrams: night.bedGrams, bedBac: night.bedBac },
    });

    const hs = hrvSeverity(night.gramsPerKg);
    add(debuffs, {
      id: 'hrv', kind: 'debuff', start: first, end: night.wake + [1, 6, 12][hs] * HOUR, status: 'active',
      severity: hs, data: { dropPct: HRV_DROP_PCT[hs], gramsPerKg: night.gramsPerKg },
    });

    const deficit = Math.max(0, night.drinks.length - night.waters.length);
    add(debuffs, {
      id: 'dehydration', kind: 'debuff', start: first, end: night.soberAt + deficit * 45 * MIN, status: 'active',
      severity: deficit === 0 ? 0 : deficit <= 2 ? 1 : 2,
      data: { drinks: night.drinks.length, waters: night.waters.length },
    });

    const hang = hangoverSeverity(night.peak);
    if (hang != null) {
      const s = night.soberAt;
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
        id: 'fatpause', kind: 'debuff', start: first, end: night.soberAt, status: 'active', severity: null,
        data: { pausedMs: night.soberAt - first },
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
