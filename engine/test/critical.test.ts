import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateNight, effects, healthState, hpLossNextHour, hpGainNextHour, summarizeNight, PRESETS, HOUR, CRITICAL_BAC } from '../src/index.ts';
import { REF, at, drink, food, BOTTLE } from './helpers.ts';

// Eight pints on an empty stomach in one go: well past the critical level for the reference person.
const binge = () => Array.from({ length: 8 }, () => drink(PRESETS.beer[0], 0));
const night = (events: ReturnType<typeof drink>[], minutes: number) => simulateNight({ profile: REF, events, now: at(minutes) });

test('at or above 0.25% the state is critical', () => {
  const n = night(binge(), 60);
  assert.ok(n.bacNow >= CRITICAL_BAC, `bac ${n.bacNow}`);
  assert.equal(healthState(n), 'critical');
});

test('coming down from critical stays critical until below 0.20%, then stabilises', () => {
  // Find the first minute after the peak where BAC is between 0.20 and 0.25, then one below 0.20.
  const base = night(binge(), 0);
  const peakMin = (base.peakAt - at(0)) / 60000;
  let between = -1, below = -1;
  for (let m = peakMin; m < peakMin + 20 * 60; m += 5) {
    const b = base.bacAt(at(m));
    if (between < 0 && b < CRITICAL_BAC && b >= 0.2) between = m;
    if (below < 0 && b < 0.2 && b > 0.01) { below = m; break; }
  }
  assert.equal(healthState(night(binge(), between)), 'critical');
  assert.equal(healthState(night(binge(), below)), 'stabilising');
});

test('a night that never reaches 0.25% is never critical', () => {
  const n = night([drink(BOTTLE, 0), drink(BOTTLE, 30)], 60);
  assert.equal(n.criticalAt, null);
  assert.equal(healthState(n), 'normal');
});

test('reaching critical adds a 48-hour Body under strain debuff', () => {
  const n = night(binge(), 90);
  const strain = effects(n, { calories: false }).debuffs.find(e => e.id === 'strain')!;
  assert.equal(strain.status, 'active');
  assert.equal(strain.end - strain.start, 48 * HOUR);
});

test('heading for critical shows Body under strain as incoming', () => {
  const n = night(binge(), 2); // drinks still absorbing; peak is ahead
  assert.ok(n.bacNow < CRITICAL_BAC);
  assert.equal(effects(n, { calories: false }).debuffs.find(e => e.id === 'strain')!.status, 'incoming');
});

test('damage over the next hour: positive while absorbing, zero once falling', () => {
  const evs = [drink(PRESETS.beer[0], 0), drink(PRESETS.beer[0], 0)];
  assert.ok(hpLossNextHour(night(evs, 1)) > 5);
  assert.equal(hpLossNextHour(night(evs, 180)), 0);
  assert.ok(hpGainNextHour(night(evs, 180)) > 0);
});

test('food slows the damage', () => {
  const evs = [drink(PRESETS.beer[0], 0), drink(PRESETS.beer[0], 0)];
  const empty = hpLossNextHour(night(evs, 1));
  const fed = hpLossNextHour(night([food(-20), ...evs], 1));
  assert.ok(fed < empty, `fed ${fed} vs empty ${empty}`);
});

test('night summaries record whether the night reached critical', () => {
  assert.equal(summarizeNight(REF, binge())!.critical, true);
  assert.equal(summarizeNight(REF, [drink(BOTTLE, 0)])!.critical, false);
});
