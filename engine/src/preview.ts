// "What would this drink do?" — shown on the drink sheet before anything is logged.

import { CRITICAL_BAC, simulateNight } from './bac.ts';
import { makeDrink } from './drinks.ts';
import { hpFromBac, phaseIndex } from './hp.ts';
import type { DrinkSpec, LogEvent, Profile } from './types.ts';

export interface DrinkPreview {
  /** Health this drink would take off the coming low point, once it's absorbed (0–100). */
  hpLoss: number;
  /** Zone (index into PHASES) the night is heading for now, and with this drink. 6 = Danger. */
  zoneBefore: number;
  zoneAfter: number;
  /** With this drink the night would reach critical (0 HP). */
  critical: boolean;
  /** When the new low point would be. */
  peakAt: number;
  /** Extra time until alcohol is cleared, in ms. */
  addedRecovery: number;
}

/** What logging `spec` right now would do to tonight. */
export function previewDrink(profile: Profile, events: LogEvent[], now: number, spec: DrinkSpec): DrinkPreview {
  const before = simulateNight({ profile, events, now });
  const after = simulateNight({ profile, events: [...events, makeDrink(spec, now, 'preview')], now });
  const zone = (bac: number) => (bac >= CRITICAL_BAC ? 6 : phaseIndex(bac));
  return {
    hpLoss: Math.max(0, hpFromBac(before.futurePeak) - hpFromBac(after.futurePeak)),
    zoneBefore: zone(before.futurePeak),
    zoneAfter: zone(after.futurePeak),
    critical: after.futurePeak >= CRITICAL_BAC,
    peakAt: after.futurePeakAt,
    addedRecovery: Math.max(0, after.soberAt - Math.max(before.soberAt, now)),
  };
}
