// When does "tonight" end? Used to file a finished night away and start a fresh one.

import { HOUR, simulateNight } from './bac.ts';
import type { LogEvent, Profile } from './types.ts';

/** A log with only water or food is dropped after this long. */
export const STALE_NON_DRINK_LOG = 18 * HOUR;

/**
 * A night is over once wake time has passed and the alcohol has cleared, so the morning starts fresh
 * (the morning report still shows it, from History). A heavy night stays current until the alcohol clears.
 * A log with no drinks (just water or food) is over 18 hours after its last entry.
 * An empty log is never "over"; there's nothing to file.
 */
export function nightIsOver(profile: Profile, events: LogEvent[], now: number): boolean {
  if (!events.length) return false;
  const drinks = events.filter(e => e.type === 'drink');
  if (!drinks.length) return now - Math.max(...events.map(e => e.t)) >= STALE_NON_DRINK_LOG;
  const night = simulateNight({ profile, events, now });
  if (now < night.wake) return false;
  return night.clearedAt == null || now >= night.clearedAt;
}
