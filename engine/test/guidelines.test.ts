import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canadaRisk, weeklyGuidance, auditCScore, auditCPositive, REGIONS } from '../src/index.ts';

test("Canada's continuum: ≤2 low, 3–6 moderate, 7+ increasingly high", () => {
  assert.equal(canadaRisk(0), 'low');
  assert.equal(canadaRisk(2), 'low');
  assert.equal(canadaRisk(3), 'moderate');
  assert.equal(canadaRisk(6), 'moderate');
  assert.equal(canadaRisk(7), 'high');
});

test('Canadian weekly lines are 2 and 6 standard drinks, with 2 per occasion', () => {
  const g = weeklyGuidance('ca', 'm');
  const drinks = (grams: number) => Math.round((grams / REGIONS.ca.gramsPerStandardDrink) * 1e6) / 1e6;
  assert.equal(drinks(g.weeklyGrams), 2);
  assert.equal(drinks(g.upperWeeklyGrams!), 6);
  assert.equal(g.perOccasionDrinks, 2);
});

test('US guidance differs by sex; UK is 14 units for everyone', () => {
  assert.ok(weeklyGuidance('us', 'f').weeklyGrams < weeklyGuidance('us', 'm').weeklyGrams);
  assert.equal(weeklyGuidance('uk', 'f').weeklyGrams, 112);
});

test('AUDIT-C scoring and cut-offs', () => {
  assert.equal(auditCScore([2, 1, 1]), 4);
  assert.equal(auditCScore([9, -1, 2]), 6); // answers are clamped to 0–4
  assert.equal(auditCPositive(4, 'ca', 'm'), true);
  assert.equal(auditCPositive(3, 'ca', 'm'), false);
  assert.equal(auditCPositive(3, 'ca', 'f'), true);
  assert.equal(auditCPositive(4, 'uk', 'm'), false);
});
