import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewDrink, makeDrink, costPerDrink, simulateNight, hpFromBac, PRESETS } from '../src/index.ts';
import { REF, at, drink, BOTTLE } from './helpers.ts';

const PINT = PRESETS.beer[0];

test('a first drink costs some HP and leaves you in an early zone', () => {
  const p = previewDrink(REF, [], at(0), BOTTLE);
  assert.ok(p.hpLoss > 3 && p.hpLoss < 30, `loss ${p.hpLoss}`);
  assert.equal(p.zoneBefore, 0);
  assert.ok(p.zoneAfter <= 1); // one standard drink peaks around 0.02% for the reference person
  assert.equal(p.critical, false);
  assert.ok(p.addedRecovery > 0);
});

test('the preview matches what actually happens when the drink is logged', () => {
  const events = [drink(PINT, 0), drink(PINT, 30)];
  const p = previewDrink(REF, events, at(45), PINT);
  const before = simulateNight({ profile: REF, events, now: at(45) });
  const after = simulateNight({ profile: REF, events: [...events, makeDrink(PINT, at(45), 'x')], now: at(45) });
  assert.ok(Math.abs(p.hpLoss - (hpFromBac(before.futurePeak) - hpFromBac(after.futurePeak))) < 1e-9);
});

test('a bigger drink costs more HP than a smaller one', () => {
  const small = previewDrink(REF, [], at(0), PRESETS.spirits[0]);
  const big = previewDrink(REF, [], at(0), PRESETS.beer[4]);
  assert.ok(big.hpLoss > small.hpLoss);
});

test('the preview flags a drink that would cross into a new zone', () => {
  // Several pints in, one more should push the projected low point into a worse zone.
  const events = Array.from({ length: 4 }, (_, i) => drink(PINT, i * 20));
  let crossed = false;
  for (let k = 0; k < 4 && !crossed; k++) {
    const p = previewDrink(REF, [...events, ...Array.from({ length: k }, () => drink(PINT, 80))], at(80), PINT);
    crossed = p.zoneAfter > p.zoneBefore;
  }
  assert.ok(crossed);
});

test('the preview warns when a drink would reach critical', () => {
  const events = Array.from({ length: 7 }, () => drink(PINT, 0));
  const p = previewDrink(REF, events, at(1), PRESETS.spirits[1]);
  assert.equal(p.critical, true);
  assert.equal(p.zoneAfter, 6);
});

test('prices: a pack splits evenly, and the price is stored on the logged drink', () => {
  assert.equal(costPerDrink(18, 6), 3);
  assert.equal(costPerDrink(20, 3), 6.67);
  assert.equal(makeDrink({ ...BOTTLE, cost: 7.5 }, 0, 'a').cost, 7.5);
  assert.equal('cost' in makeDrink(BOTTLE, 0, 'b'), false);
});
