import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alcoholGrams, standardDrinks, makeDrink, guessCategory, PRESETS } from '../src/index.ts';

test('a 341 ml bottle of 5% beer is one Canadian standard drink (13.45 g)', () => {
  const g = alcoholGrams(341, 5);
  assert.ok(Math.abs(g - 13.45) < 0.01, `got ${g}`);
  assert.ok(Math.abs(standardDrinks(g, 'ca') - 1) < 0.001);
});

test('the same bottle is about 1.7 UK units', () => {
  assert.ok(Math.abs(standardDrinks(alcoholGrams(341, 5), 'uk') - 1.68) < 0.01);
});

test('calories = alcohol at 7 kcal/g plus carbs at 4 kcal/g', () => {
  const d = makeDrink({ name: 'Test', ml: 100, abv: 10, carbPer100ml: 5 }, 0, 'x');
  // 100 ml × 10% × 0.789 = 7.89 g → 55.2 kcal; 5 g carbs → 20 kcal
  assert.equal(d.kcal, 75);
  assert.equal(d.kcalFromAlcohol, 55);
});

test('a label calorie value overrides the estimate', () => {
  const d = makeDrink({ name: 'Imperial IPA', ml: 473, abv: 7, kcal: 280 }, 0, 'x');
  assert.equal(d.kcal, 280);
  assert.ok(d.kcalFromAlcohol <= d.kcal);
});

test('every preset is tagged with its category', () => {
  for (const [cat, list] of Object.entries(PRESETS)) for (const p of list) assert.equal(p.category, cat);
});

test('category guessing for drinks logged without one', () => {
  assert.equal(guessCategory('Red wine'), 'wine');
  assert.equal(guessCategory('Gin and tonic'), 'mixed');
  assert.equal(guessCategory('Whisky'), 'spirits');
  assert.equal(guessCategory('Hazy pale ale'), 'beer');
});
