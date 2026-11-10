import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hpFromBac, phaseIndex, PHASES, THRESHOLDS } from '../src/index.ts';

test('full health when sober, zero at the danger threshold', () => {
  assert.equal(hpFromBac(0), 100);
  assert.equal(hpFromBac(0.25), 0);
  assert.equal(hpFromBac(0.4), 0);
});

test('each milestone sits on an equal slice boundary', () => {
  THRESHOLDS.slice(0, 6).forEach((th, k) => {
    assert.ok(Math.abs(hpFromBac(th) - (100 - (k * 100) / 6)) < 1e-9, `threshold ${th}`);
  });
});

test('health only goes down as blood alcohol goes up', () => {
  let prev = 101;
  for (let b = 0; b <= 0.26; b += 0.001) { const hp = hpFromBac(b); assert.ok(hp <= prev); prev = hp; }
});

test('phase names line up with the thresholds', () => {
  assert.equal(PHASES[phaseIndex(0.01)].name, 'Fresh');
  assert.equal(PHASES[phaseIndex(0.06)].name, 'Tipsy');
  assert.equal(PHASES[phaseIndex(0.08)].name, 'Drunk');
  assert.equal(PHASES[phaseIndex(0.3)].name, 'Danger');
});
