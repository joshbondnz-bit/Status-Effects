// Debuffs that outlast their night. Once a night is filed into History, things like Slow recovery,
// Hangover and Body under strain can still be running. These carry them onto Tonight, and stack them
// with tonight's own debuffs when you drink again before they've worn off.

import { simulateNight, type Night } from './bac.ts';
import { effects, type Effect, type EffectOptions } from './effects.ts';
import type { LogEvent, Profile } from './types.ts';

/** How many recent nights are checked. Nothing lasts longer than about two days. */
export const LINGER_NIGHTS = 4;

/** Higher of two severities (null = unrated, lowest). */
const worse = (a: Effect['severity'], b: Effect['severity']) => (a == null ? b : b == null ? a : (Math.max(a, b) as Effect['severity']));

/** Fold `b` into `a` (same debuff): the later end, the worse severity, the stacks added up. */
function stack(a: Effect, b: Effect): Effect {
  return {
    ...a,
    start: Math.min(a.start, b.start),
    end: Math.max(a.end, b.end),
    severity: worse(a.severity, b.severity),
    stacks: (a.stacks ?? 1) + (b.stacks ?? 1),
    carriedFrom: Math.max(a.carriedFrom ?? -Infinity, b.carriedFrom ?? -Infinity),
  };
}

/**
 * Debuffs from earlier nights that are running right now, each tagged with the night it came from
 * (`carriedFrom`). The same debuff from two earlier nights becomes one, stacked. `nights` holds each
 * earlier night's simulation, keyed by its first drink, for descriptions that need it.
 */
export function lingeringDebuffs(profile: Profile, past: LogEvent[][], now: number, opts: EffectOptions): { debuffs: Effect[]; nights: Map<number, Night> } {
  const byId = new Map<string, Effect>();
  const nights = new Map<number, Night>();
  for (const events of past.slice(-LINGER_NIGHTS)) {
    if (!events.some(e => e.type === 'drink')) continue;
    const night = simulateNight({ profile, events, now });
    const from = night.firstDrink!.t;
    for (const e of effects(night, { ...opts, endedAt: null }).debuffs) {
      if (e.status !== 'active' || e.start > now || e.end <= now) continue;
      nights.set(from, night);
      const tagged: Effect = { ...e, carriedFrom: from };
      const had = byId.get(e.id);
      byId.set(e.id, had ? stack(had, tagged) : tagged);
    }
  }
  return { debuffs: [...byId.values()], nights };
}

/**
 * Put tonight's debuffs and the lingering ones together. A debuff that's both lingering and caused
 * again tonight becomes one stacked debuff (already running, so it's active even if tonight's part
 * is still incoming). Returns tonight's list (with the stacks) and the rest of the lingering ones.
 */
export function withLingering(tonight: Effect[], lingering: Effect[]): { debuffs: Effect[]; lingering: Effect[] } {
  const left = new Map(lingering.map(e => [e.id, e]));
  const debuffs = tonight.map(t => {
    const l = left.get(t.id);
    if (!l) return t;
    left.delete(t.id);
    return { ...stack(t, l), status: 'active' as const, data: t.data };
  });
  return { debuffs, lingering: [...left.values()] };
}
