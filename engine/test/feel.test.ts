import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feelVsDrinks, feelWord } from '../src/index.ts';

test('feel check-ins are grouped by drinks the night before and averaged', () => {
  const b = feelVsDrinks([
    { std: 1.5, feel: 0 }, { std: 2, feel: 1 },
    { std: 4.4, feel: 2 },
    { std: 8, feel: 4 }, { std: 7, feel: 3 },
  ]);
  assert.deepEqual(b.map(x => x.nights), [2, 1, 0, 2]);
  assert.equal(b[0].avg, 0.5);
  assert.equal(b[2].avg, null);
  assert.equal(b[3].avg, 3.5);
});

test('bucket edges: 2.5 std drinks counts as 3–4', () => {
  assert.equal(feelVsDrinks([{ std: 2.5, feel: 2 }])[1].nights, 1);
});

test('averages map back to the nearest word', () => {
  assert.equal(feelWord(0.4), 'Great');
  assert.equal(feelWord(2.6), 'Rough');
  assert.equal(feelWord(9), 'Wrecked');
});
