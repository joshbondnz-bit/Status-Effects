import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyCalories } from '../src/index.ts';
import { REF } from './helpers.ts';

test('daily calories for the reference person (80 kg, 178 cm, 32, male) are about 2,460', () => {
  assert.equal(dailyCalories(REF), 2460);
});

test('smaller and older people need fewer calories; the female formula is lower', () => {
  assert.ok(dailyCalories({ ...REF, weightKg: 60 }) < dailyCalories(REF));
  assert.ok(dailyCalories({ ...REF, age: 60 }) < dailyCalories(REF));
  assert.ok(dailyCalories({ ...REF, sex: 'f' }) < dailyCalories(REF));
});

test('results are rounded to the nearest 10 kcal', () => {
  assert.equal(dailyCalories({ ...REF, weightKg: 71.3 }) % 10, 0);
});
