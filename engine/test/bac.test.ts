import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateNight, totalBodyWater, nightWindow, MIN, HOUR, PRESETS } from '../src/index.ts';
import { REF, at, drink, food, BOTTLE } from './helpers.ts';

const near = (actual: number, expected: number, tol: number, msg = '') =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected} ± ${tol}, got ${actual}`);

test('Watson body water for the reference person (80 kg, 178 cm, 32, male) is about 45 L', () => {
  near(totalBodyWater(REF), 45.4, 0.1);
});

test('no drinks means no blood alcohol', () => {
  const n = simulateNight({ profile: REF, events: [], now: at(0) });
  assert.equal(n.bacNow, 0);
  assert.equal(n.peak, 0);
  assert.equal(n.clearedAt, null);
});

test('one standard drink on an empty stomach peaks in 15–45 min at a modest level', () => {
  const n = simulateNight({ profile: REF, events: [drink(BOTTLE, 0)], now: at(0) });
  const minutes = (n.peakAt - at(0)) / MIN;
  assert.ok(minutes >= 15 && minutes <= 45, `peak after ${minutes} min`);
  assert.ok(n.peak > 0.01 && n.peak < 0.025, `peak ${n.peak}`);
});

test('food lowers and delays the peak', () => {
  const empty = simulateNight({ profile: REF, events: [drink(BOTTLE, 0), drink(BOTTLE, 0)], now: at(0) });
  const fed = simulateNight({ profile: REF, events: [food(-30), drink(BOTTLE, 0), drink(BOTTLE, 0)], now: at(0) });
  assert.ok(fed.peak < empty.peak, `fed ${fed.peak} vs empty ${empty.peak}`);
  assert.ok(fed.peakAt > empty.peakAt);
});

test('once absorbed, blood alcohol falls about 0.015% an hour', () => {
  const big = [drink(PRESETS.beer[0], 0), drink(PRESETS.beer[0], 0), drink(PRESETS.beer[0], 0)];
  const n = simulateNight({ profile: REF, events: big, now: at(0) });
  near(n.bacAt(at(180)) - n.bacAt(at(240)), 0.015, 0.0005, 'hourly drop');
});

test('the level keeps rising after the last drink (absorption lag)', () => {
  const n = simulateNight({ profile: REF, events: [drink(PRESETS.beer[0], 0)], now: at(5) });
  assert.ok(n.futurePeak > n.bacNow + 0.005, `now ${n.bacNow}, still to reach ${n.futurePeak}`);
  assert.ok(n.stomachNow > 5, 'most of the drink is still in the stomach');
});

test('alcohol eventually clears, after the peak', () => {
  const n = simulateNight({ profile: REF, events: [drink(BOTTLE, 0), drink(BOTTLE, 30)], now: at(0) });
  assert.ok(n.clearedAt !== null && n.clearedAt > n.peakAt);
  assert.equal(n.bacAt(n.clearedAt! + 10 * MIN), 0);
});

test('a lighter person reaches a higher level from the same drinks', () => {
  const light = { ...REF, weightKg: 55, heightCm: 163, sex: 'f' as const };
  const events = [drink(BOTTLE, 0), drink(BOTTLE, 20)];
  const a = simulateNight({ profile: REF, events, now: at(0) });
  const b = simulateNight({ profile: light, events, now: at(0) });
  assert.ok(b.peak > a.peak * 1.3, `light ${b.peak} vs reference ${a.peak}`);
});

test('bedtime falls on the same evening, wake time on the next morning', () => {
  const { bed, wake } = nightWindow(REF, at(30));
  assert.equal(new Date(bed).getHours(), 23);
  assert.equal((wake - bed) / HOUR, 8);
});

test('a bedtime after midnight rolls to the next day', () => {
  const { bed } = nightWindow({ ...REF, bedtime: '01:00' }, at(0));
  assert.ok(bed > at(0));
  assert.equal((bed - at(0)) / HOUR, 6);
});

test('alcohol still in the body at bedtime is reported in grams', () => {
  const late = [drink(BOTTLE, 210), drink(BOTTLE, 240), drink(BOTTLE, 260)]; // 10:30–11:20 pm
  const n = simulateNight({ profile: REF, events: late, now: at(210) });
  assert.ok(n.bedBac > 0 && n.bedGrams > 10, `bedGrams ${n.bedGrams}`);
});
