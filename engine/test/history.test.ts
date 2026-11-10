import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, byNight, dayKey, daysInclusive, dryStreaks, nightOf, periodRange, periodStats, startOfWeek, stepPeriod,
  summarizeNight, PRESETS, HOUR, type NightSummary,
} from '../src/index.ts';
import { REF, drink, water, BOTTLE } from './helpers.ts';

const day = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

test('weeks start on Monday', () => {
  assert.equal(dayKey(startOfWeek(day(2026, 11, 12))), '2026-11-09'); // Thu → Mon
  assert.equal(dayKey(startOfWeek(day(2026, 11, 15))), '2026-11-09'); // Sun → Mon
});

test('period ranges and stepping', () => {
  const w = periodRange('week', day(2026, 11, 10));
  assert.deepEqual([dayKey(w.start), dayKey(w.end)], ['2026-11-09', '2026-11-15']);
  const m = periodRange('month', day(2026, 2, 10));
  assert.deepEqual([dayKey(m.start), dayKey(m.end)], ['2026-02-01', '2026-02-28']);
  assert.equal(dayKey(stepPeriod('month', day(2026, 1, 15), -1)), '2025-12-01');
  assert.equal(dayKey(stepPeriod('year', day(2026, 6, 1), 1)), '2027-01-01');
  assert.equal(daysInclusive(day(2026, 11, 1), day(2026, 11, 30)), 30);
});

test('drinks after midnight count toward the previous night', () => {
  assert.equal(nightOf(day(2026, 11, 7, 0, 30)), '2026-11-06');
  assert.equal(nightOf(day(2026, 11, 7, 19, 0)), '2026-11-07');
});

test('a night summary totals drinks, water and drink types', () => {
  const s = summarizeNight(REF, [drink(BOTTLE, 0), drink(PRESETS.wine[0], 40), water(50)])!;
  assert.equal(s.drinks, 2);
  assert.equal(s.waters, 1);
  assert.ok(s.mix.beer > 13 && s.mix.wine > 18);
  assert.ok(s.debuffEnd > s.start);
});

test('a log with no drinks has no summary', () => {
  assert.equal(summarizeNight(REF, [water(0)]), null);
});

function fake(dayStr: string, grams: number, startHour = 20, hoursOfDebuff = 12): NightSummary {
  const [y, m, d] = dayStr.split('-').map(Number);
  const start = new Date(y, m - 1, d, startHour).getTime();
  return { day: dayStr, start, debuffEnd: start + hoursOfDebuff * HOUR, drinks: 2, grams, kcal: 200, peak: grams > 50 ? 0.09 : 0.03,
    bedGrams: 0, sleepHoursAffected: 0, waters: 0, spanHours: 2, mix: { beer: grams, wine: 0, spirits: 0, mixed: 0 } };
}

test('period totals count dry days and heavy nights', () => {
  const nights = byNight([fake('2026-11-02', 30), fake('2026-11-06', 80)]);
  const st = periodStats(nights, day(2026, 11, 2), day(2026, 11, 8), day(2026, 1, 1), day(2026, 11, 30));
  assert.equal(st.days, 7);
  assert.equal(st.dryDays, 5);
  assert.equal(st.grams, 110);
  assert.equal(st.heavyNights, 1);
  assert.equal(st.gramsByWeekday[0], 30); // Monday
  assert.equal(st.gramsByWeekday[4], 80); // Friday
});

test('a period only counts days between tracking start and today', () => {
  const st = periodStats(new Map(), day(2026, 11, 1), day(2026, 11, 30), day(2026, 11, 5), day(2026, 11, 10));
  assert.equal(st.days, 6); // Nov 5–10
});

test('overlapping debuff windows are only counted once', () => {
  const nights = byNight([fake('2026-11-06', 80, 20, 48), fake('2026-11-07', 80, 20, 12)]);
  const st = periodStats(nights, day(2026, 11, 6), day(2026, 11, 8), day(2026, 1, 1), day(2026, 11, 30));
  assert.equal(st.debuffHours, 48); // Fri 8 pm → Sun 8 pm; Saturday's 12 h sits inside it
});

test('alcohol-free streaks: current and longest', () => {
  const nights = byNight([fake('2026-11-01', 20), fake('2026-11-05', 20)]);
  const s = dryStreaks(nights, day(2026, 10, 25), day(2026, 11, 10));
  assert.equal(s.current, 5);  // Nov 6–10
  assert.equal(s.longest, 7);  // Oct 25–31
});

test('two logs on the same night are combined', () => {
  const m = byNight([fake('2026-11-06', 20), fake('2026-11-06', 30)]);
  assert.equal(m.get('2026-11-06')!.grams, 50);
  assert.equal(m.get('2026-11-06')!.drinks, 4);
});

test('addDays lands on midnight across the November clock change', () => {
  const t = addDays(day(2026, 10, 31), 2);
  assert.equal(new Date(t).getHours(), 0);
  assert.equal(dayKey(t), '2026-11-02');
});
