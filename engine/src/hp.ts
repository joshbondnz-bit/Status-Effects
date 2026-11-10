// Maps blood alcohol onto the health bar.
// The bar is six equal slices between these milestones, so early drinks show up.

import { CRITICAL_BAC, MIN, type Night } from './bac.ts';

/** BAC milestones (%), from Fresh to Danger. */
export const THRESHOLDS = [0, 0.02, 0.05, 0.08, 0.11, 0.15, 0.25] as const;

export type PhaseKey = 'fresh' | 'buzzed' | 'tipsy' | 'drunk' | 'rough' | 'wasted' | 'danger';
export const PHASES: { key: PhaseKey; name: string; from: number }[] = [
  { key: 'fresh', name: 'Fresh', from: 0 },
  { key: 'buzzed', name: 'Buzzed', from: 0.02 },
  { key: 'tipsy', name: 'Tipsy', from: 0.05 },
  { key: 'drunk', name: 'Drunk', from: 0.08 },
  { key: 'rough', name: 'Rough', from: 0.11 },
  { key: 'wasted', name: 'Wasted', from: 0.15 },
  { key: 'danger', name: 'Danger', from: 0.25 },
];

/** Index into PHASES for a BAC (0 = Fresh … 6 = Danger). */
export function phaseIndex(bac: number): number {
  let k = 0;
  while (k < 6 && bac >= THRESHOLDS[k + 1]) k++;
  return k;
}

/** Health points (0–100) for a BAC. */
export function hpFromBac(bac: number): number {
  if (bac >= 0.25) return 0;
  const k = phaseIndex(bac);
  const frac = (bac - THRESHOLDS[k]) / (THRESHOLDS[k + 1] - THRESHOLDS[k]);
  return Math.min(100, Math.max(0, 100 - ((k + frac) * 100) / 6));
}

/** Once someone has hit 0 HP, they stay "critical" until blood alcohol is clearly below the line. */
export const STABLE_BELOW = 0.2;

/**
 * - critical: at or above 0.25%, or came down from it but still above 0.20% (so it can't flicker)
 * - stabilising: reached critical tonight, now below 0.20% but alcohol not yet cleared
 * - normal: everything else
 */
export type HealthState = 'critical' | 'stabilising' | 'normal';

export function healthState(night: Night): HealthState {
  if (night.bacNow >= CRITICAL_BAC) return 'critical';
  if (night.peakSoFar >= CRITICAL_BAC) {
    if (night.bacNow >= STABLE_BELOW) return 'critical';
    if (night.bacNow > 0) return 'stabilising';
  }
  return 'normal';
}

/** Health that will be lost over the next hour (0 if health is steady or rising). */
export function hpLossNextHour(night: Night): number {
  const hpNow = hpFromBac(night.bacNow);
  let low = hpNow;
  for (let t = night.now; t <= night.now + 60 * MIN; t += MIN) low = Math.min(low, hpFromBac(night.bacAt(t)));
  return hpNow - low;
}

/** Health regained over the next hour (0 if still taking damage). */
export function hpGainNextHour(night: Night): number {
  return Math.max(0, hpFromBac(night.bacAt(night.now + 60 * MIN)) - hpFromBac(night.bacNow));
}
