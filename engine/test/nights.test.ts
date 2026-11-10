import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nightIsOver, HOUR, PRESETS } from '../src/index.ts';
import { REF, at, drink, water, BOTTLE } from './helpers.ts';

// at(0) is 7:00 pm. With REF's 07:30 wake time, wake is at(750); +4h grace is at(990), 11:30 am.

test('an empty log is never over', () => {
  assert.equal(nightIsOver(REF, [], at(5000)), false);
});

test('a night is still current during the evening and the next morning', () => {
  const evs = [drink(BOTTLE, 0), drink(BOTTLE, 60)];
  assert.equal(nightIsOver(REF, evs, at(120)), false);   // 9 pm
  assert.equal(nightIsOver(REF, evs, at(780)), false);   // 8 am, just after waking
});

test('a night is over 4 hours after wake time, once alcohol has cleared', () => {
  const evs = [drink(BOTTLE, 0), drink(BOTTLE, 60)];
  assert.equal(nightIsOver(REF, evs, at(989)), false);
  assert.equal(nightIsOver(REF, evs, at(990)), true);
});

test("a very heavy night isn't filed away while alcohol is still in the body", () => {
  // Drinking until 6:30 am keeps alcohol in the body well past 11:30 am.
  const evs = Array.from({ length: 24 }, (_, i) => drink(PRESETS.beer[0], i * 30));
  assert.equal(nightIsOver(REF, evs, at(990)), false);
});

test('a log with only water is dropped after 18 hours', () => {
  const evs = [water(0)];
  assert.equal(nightIsOver(REF, evs, at(0) + 17 * HOUR), false);
  assert.equal(nightIsOver(REF, evs, at(0) + 18 * HOUR), true);
});
