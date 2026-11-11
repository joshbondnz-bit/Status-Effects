import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateNight, effects, hangoverSeverity, PRESETS, HOUR, type Effect } from '../src/index.ts';
import { REF, at, drink, food, water, BOTTLE } from './helpers.ts';

const ids = (list: Effect[]) => list.map(e => e.id);
const find = (list: Effect[], id: string) => list.find(e => e.id === id);

test('no drinks, no debuffs', () => {
  const n = simulateNight({ profile: REF, events: [], now: at(0) });
  assert.deepEqual(effects(n, { calories: true }).debuffs, []);
});

test('a typical night: sleep, HRV, dehydration and judgment debuffs', () => {
  const evs = [food(-20), drink(PRESETS.beer[0], 30), drink(PRESETS.beer[0], 75), drink(PRESETS.beer[3], 115)];
  const n = simulateNight({ profile: REF, events: evs, now: at(150) });
  const d = ids(effects(n, { calories: false }).debuffs);
  for (const id of ['sleep', 'hrv', 'dehydration', 'judgment']) assert.ok(d.includes(id as never), `missing ${id}`);
  assert.ok(!d.includes('fatpause'), 'food debuffs stay off when calories are off');
});

test('the calorie setting adds fat burning paused', () => {
  const n = simulateNight({ profile: REF, events: [drink(BOTTLE, 0)], now: at(10) });
  assert.ok(ids(effects(n, { calories: true }).debuffs).includes('fatpause'));
});

test('a heavy night queues a hangover that starts once alcohol clears', () => {
  const evs = Array.from({ length: 8 }, (_, i) => drink(PRESETS.beer[0], i * 30));
  const n = simulateNight({ profile: REF, events: evs, now: at(240) });
  assert.ok(n.peak >= 0.11, `peak ${n.peak}`);
  const h = find(effects(n, { calories: false }).debuffs, 'hangover')!;
  assert.equal(h.status, 'incoming');
  assert.equal(h.start, n.soberAt);
  assert.ok(h.severity! >= 1);
});

test('no hangover debuff for a single drink', () => {
  const n = simulateNight({ profile: REF, events: [drink(BOTTLE, 0)], now: at(10) });
  assert.ok(n.peak < 0.05, `peak ${n.peak}`);
  assert.equal(find(effects(n, { calories: false }).debuffs, 'hangover'), undefined);
});

test('hangover is possible from a 0.05% peak, likely from 0.11%, severe from 0.15%', () => {
  assert.equal(hangoverSeverity(0.049), null);
  assert.equal(hangoverSeverity(0.05), 0);
  assert.equal(hangoverSeverity(0.079), 0);
  assert.equal(hangoverSeverity(0.11), 1);
  assert.equal(hangoverSeverity(0.15), 2);
});

test('water clears the dehydration deficit and earns the Hydrated buff', () => {
  const evs = [drink(BOTTLE, 0), water(10), drink(BOTTLE, 40), water(50)];
  const n = simulateNight({ profile: REF, events: evs, now: at(60) });
  const fx = effects(n, { calories: false });
  assert.equal(find(fx.debuffs, 'dehydration')!.severity, 0);
  assert.ok(ids(fx.buffs).includes('hydrated'));
});

test('an hour off earns Steady pace; ending the night early earns Called it', () => {
  const n = simulateNight({ profile: REF, events: [drink(BOTTLE, 0)], now: at(60) });
  assert.ok(ids(effects(n, { calories: false }).buffs).includes('pace'));
  const ended = effects(n, { calories: false, endedAt: at(60) });
  assert.ok(ids(ended.buffs).includes('called'));
  assert.ok(!ids(ended.buffs).includes('pace'));
});

test('HRV drain lasts longer after a heavier night', () => {
  // One bottle at 10 pm vs. six pints from 8 pm, both reaching into the night.
  const light = simulateNight({ profile: REF, events: [drink(BOTTLE, 180)], now: at(190) });
  const heavy = simulateNight({ profile: REF, events: Array.from({ length: 6 }, (_, i) => drink(PRESETS.beer[0], 60 + i * 30)), now: at(190) });
  const end = (n: typeof light) => find(effects(n, { calories: false }).debuffs, 'hrv')!.end;
  assert.ok(end(heavy) - end(light) >= 5 * HOUR);
});

test('active debuffs come before incoming ones', () => {
  const evs = Array.from({ length: 8 }, (_, i) => drink(PRESETS.beer[0], i * 30));
  const d = effects(simulateNight({ profile: REF, events: evs, now: at(240) }), { calories: false }).debuffs;
  const firstIncoming = d.findIndex(e => e.status === 'incoming');
  assert.ok(firstIncoming > 0 && d.slice(firstIncoming).every(e => e.status === 'incoming'));
});

test('a light night (0.05–0.08% peak) gets a short, possible hangover', () => {
  const evs = Array.from({ length: 4 }, (_, i) => drink(BOTTLE, i * 20));
  const n = simulateNight({ profile: REF, events: evs, now: at(0) });
  assert.ok(n.peak >= 0.05 && n.peak < 0.08, `peak ${n.peak}`);
  const fx = effects(n, { calories: false }).debuffs;
  const h = find(fx, 'hangover')!, a = find(fx, 'hangxiety')!;
  assert.equal(h.severity, 0);
  assert.equal(h.end - h.start, 6 * HOUR);
  assert.equal(a.end - a.start, 8 * HOUR);
});
