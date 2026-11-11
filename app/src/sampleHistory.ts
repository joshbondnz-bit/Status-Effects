// A year of made-up nights for previewing History. Never saved; shown with a "Sample" label.
import { PRESETS, MIN, addDays, makeDrink, startOfDay, summarizeNight, type LogEvent, type NightSummary, type Profile } from '../../engine/src/index.ts';

/** Small seeded random generator, so the sample looks the same every time. */
function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

export function sampleHistory(profile: Profile, today: number): { summaries: NightSummary[]; logs: Map<string, LogEvent[]>; trackingStart: number } {
  const R = rng(20261110);
  const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
  const day0 = startOfDay(today);
  const out: NightSummary[] = [];
  const logs = new Map<string, LogEvent[]>(); // each night's log, for the recap
  let id = 0;
  for (let i = 365; i >= 1; i--) {
    const day = addDays(day0, -i);
    const dow = new Date(day).getDay();
    // More likely on Fri/Sat; a little less in the last two months, so trends have something to show.
    const chance = [0.2, 0.08, 0.1, 0.14, 0.3, 0.7, 0.62][dow] * (i < 60 ? 0.8 : 1);
    // The last two Fridays and Saturdays always have a night out, so the week view has something to show.
    const recentWeekend = i <= 14 && (dow === 5 || dow === 6);
    if (R() > chance && !recentWeekend) continue;
    const weekend = dow === 5 || dow === 6;
    let n = weekend ? 2 + Math.floor(R() * 5) : 1 + Math.floor(R() * 3);
    if (R() < 0.07) n += 3;
    const style = R();
    const pool = style < 0.5 ? PRESETS.beer.slice(0, 5) : style < 0.78 ? PRESETS.wine : style < 0.92 ? PRESETS.mixed : PRESETS.spirits.slice(0, 2);
    let t = day + (18 + Math.floor(R() * 3)) * 60 * MIN + Math.floor(R() * 4) * 15 * MIN;
    const events: LogEvent[] = [];
    if (R() < 0.6) events.push({ type: 'food', id: `s${id++}`, t: t - 30 * MIN });
    for (let k = 0; k < n; k++) {
      events.push(makeDrink(pick(pool), t, `s${id++}`));
      if (R() < 0.3) events.push({ type: 'water', id: `s${id++}`, t: t + 20 * MIN });
      t += ((weekend ? 38 : 55) + Math.floor(R() * 35)) * MIN;
    }
    const s = summarizeNight(profile, events);
    if (s) { out.push(s); logs.set(s.day, events); }
  }
  return { summaries: out, logs, trackingStart: addDays(day0, -365) };
}
