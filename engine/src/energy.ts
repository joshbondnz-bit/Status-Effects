// How many calories a person needs in a day, so drinks can be shown as a share of it.

import type { Profile } from './types.ts';

/** Light activity (mostly sitting, some walking). Kept modest so the share isn't understated. */
export const LIGHT_ACTIVITY = 1.4;

/**
 * Estimated daily calorie needs: the Mifflin–St Jeor resting rate for this person,
 * times a light-activity factor, rounded to the nearest 10 kcal.
 */
export function dailyCalories(p: Profile): number {
  const resting = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'm' ? 5 : -161);
  return Math.round((resting * LIGHT_ACTIVITY) / 10) * 10;
}
