// Drinking guidance by region, Canada's risk continuum, and AUDIT-C scoring.
// All figures need checking against the official sources before launch.

import { REGIONS } from './drinks.ts';
import type { RegionCode, Sex } from './types.ts';

export interface WeeklyGuidance {
  /** Main weekly line, in grams of alcohol. */
  weeklyGrams: number;
  /** Second line, for regions that describe a continuum (Canada: moderate risk ceiling). */
  upperWeeklyGrams?: number;
  /** Advice for any single occasion, in standard drinks, if the region gives one. */
  perOccasionDrinks?: number;
  source: string;
}

export function weeklyGuidance(region: RegionCode, sex: Sex): WeeklyGuidance {
  const g = REGIONS[region].gramsPerStandardDrink;
  switch (region) {
    case 'ca': return { weeklyGrams: 2 * g, upperWeeklyGrams: 6 * g, perOccasionDrinks: 2, source: "Canada's Guidance on Alcohol and Health (CCSA, 2023)" };
    case 'uk': return { weeklyGrams: 14 * g, source: 'UK Chief Medical Officers (2016)' };
    case 'us': return { weeklyGrams: (sex === 'f' ? 7 : 14) * g, source: 'Dietary Guidelines for Americans' };
    case 'au': return { weeklyGrams: 10 * g, source: 'NHMRC Australian guidelines (2020)' };
    case 'eu': return { weeklyGrams: 10 * g, source: 'Varies by country' };
  }
}

export type CanadaRisk = 'low' | 'moderate' | 'high';

/** Canada's 2023 continuum: 2 or fewer drinks a week low, 3–6 moderate, 7 or more increasingly high. */
export function canadaRisk(drinksPerWeek: number): CanadaRisk {
  if (drinksPerWeek <= 2) return 'low';
  if (drinksPerWeek <= 6) return 'moderate';
  return 'high';
}

/** AUDIT-C total (0–12) from three answers, each scored 0–4. */
export function auditCScore(answers: [number, number, number]): number {
  return answers.reduce((s, a) => s + Math.min(4, Math.max(0, Math.round(a))), 0);
}

/** Cut-off for a positive screen: UK version 5+, elsewhere 4+ for men and 3+ for women. */
export function auditCCutoff(region: RegionCode, sex: Sex): number {
  if (region === 'uk') return 5;
  return sex === 'f' ? 3 : 4;
}

export function auditCPositive(score: number, region: RegionCode, sex: Sex): boolean {
  return score >= auditCCutoff(region, sex);
}
