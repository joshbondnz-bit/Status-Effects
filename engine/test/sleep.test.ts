import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateNight, effects, nightWindow, PRESETS, MIN, HOUR, type Effect } from '../src/index.ts';
import { REF, at, drink, BOTTLE } from './helpers.ts';

// at(0) is 7:00 pm; REF's bedtime is 23:30, i.e. at(270). Negative minutes are earlier that day.
const find = (list: Effect[], id: string) => list.find(e => e.id === id);
const fxAt = (events: ReturnType<typeof drink>[], now: number) => {
  const night = simulateNight({ profile: REF, events, now });
  return { night, fx: effects(night, { calories: false }) };
};

test('a single drink at lunchtime causes no sleep or HRV debuff', () => {
  const noon = -7 * 60 + 26; // 12:26 pm
  const { fx } = fxAt([drink(BOTTLE, noon)], at(noon + 5));
  assert.equal(find(fx.debuffs, 'sleep'), undefined);
  assert.equal(find(fx.debuffs, 'hrv'), undefined);
  assert.ok(find(fx.debuffs, 'judgment') || find(fx.debuffs, 'dehydration'), 'daytime effects still apply');
});

test('an afternoon session that clears hours before bed leaves sleep alone', () => {
  const evs = [0, 30, 60].map(m => drink(BOTTLE, -5 * 60 + m)); // 2–3 pm
  assert.equal(find(fxAt(evs, at(-3 * 60)).fx.debuffs, 'sleep'), undefined);
});

test('alcohol still in the body at bedtime: sleep debuff is incoming, starting at bedtime', () => {
  const evs = Array.from({ length: 4 }, (_, i) => drink(PRESETS.beer[0], 60 + i * 40)); // 8–10 pm, pints
  const { night, fx } = fxAt(evs, at(200));
  const sleep = find(fx.debuffs, 'sleep')!;
  assert.ok(night.bedGrams > 1, `bedGrams ${night.bedGrams}`);
  assert.equal(sleep.status, 'incoming');
  assert.equal(sleep.start, night.bed);
  assert.equal(sleep.end, night.wake);
  assert.ok(sleep.severity! >= 1);
});

test('after bedtime the sleep debuff is active', () => {
  const evs = Array.from({ length: 4 }, (_, i) => drink(PRESETS.beer[0], 60 + i * 40));
  assert.equal(find(fxAt(evs, at(300)).fx.debuffs, 'sleep')!.status, 'active');
});

test('a drink within 3 hours of bed counts, even if it has cleared by then', () => {
  const { night, fx } = fxAt([drink(PRESETS.spirits[0], 120)], at(125)); // single shot at 9 pm
  assert.ok(night.bedGrams <= 1, 'cleared by bedtime');
  assert.equal(find(fx.debuffs, 'sleep')!.severity, 0);
});

test('HRV is milder when drinking ended within 4 hours of bed but has cleared', () => {
  const { fx } = fxAt([drink(BOTTLE, 60)], at(65)); // one bottle at 8 pm
  const hrv = find(fx.debuffs, 'hrv');
  assert.ok(hrv, 'HRV still flagged');
  assert.equal(hrv!.severity, 0);
});

test('drinking past the usual bedtime pushes bedtime to just after the last drink', () => {
  const late = [drink(BOTTLE, 330), drink(BOTTLE, 390)]; // 12:30 am and 1:30 am
  const night = simulateNight({ profile: REF, events: late, now: at(395) });
  assert.equal(night.bed, at(390) + 15 * MIN);
  assert.ok(night.wake - night.bed >= 4 * HOUR);
  const sleep = find(effects(night, { calories: false }).debuffs, 'sleep')!;
  assert.equal(sleep.status, 'incoming');
});

test('a first drink just after midnight belongs to the bedtime that just passed', () => {
  const { bed } = nightWindow(REF, at(330)); // 12:30 am
  assert.equal(bed, at(270)); // 11:30 pm, not tomorrow night
});
