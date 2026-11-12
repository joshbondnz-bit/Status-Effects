import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entriesCsv, nightsCsv, makeDrink, PRESETS } from '../src/index.ts';
import { REF, at, drink, water, BOTTLE } from './helpers.ts';

test('entries: a header and one row per entry, oldest first, with the morning check-in', () => {
  const csv = entriesCsv([{ events: [water(30), drink(BOTTLE, 0)], feel: 3 }], 'ca');
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^night,date,time,type,name,size,volume_ml,abv_percent,standard_drinks/);
  assert.match(lines[1], /,drink,/);
  assert.match(lines[1], /,1,.*,Rough$/); // one Canadian standard drink; feel 3 = Rough
  assert.match(lines[2], /,water,Water,/);
});

test('entries: names with commas or quotes are quoted', () => {
  const d = makeDrink({ ...PRESETS.beer[0], name: 'Fat "Tug", IPA' }, at(0), 'x');
  const csv = entriesCsv([{ events: [d] }], 'ca');
  assert.ok(csv.includes('"Fat ""Tug"", IPA"'));
});

test('nights: one row per night with drinks, with totals', () => {
  const csv = nightsCsv(REF, [{ events: [drink(BOTTLE, 0), drink(BOTTLE, 60)], feel: 0 }, { events: [water(5000)] }]);
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 2); // the water-only night is left out
  const cells = lines[1].split(',');
  assert.equal(cells[3], '2');      // drinks
  assert.equal(cells[4], '2');      // standard drinks
  assert.equal(cells.at(-1), 'Great');
});
