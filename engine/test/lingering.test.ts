import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effects, lingeringDebuffs, simulateNight, withLingering } from '../src/index.ts';
import { REF, at, drink, BOTTLE } from './helpers.ts';

// at(0) is 7:00 pm Friday. Ten bottles over about 4 hours is a heavy night for REF.
const friday = () => Array.from({ length: 10 }, (_, i) => drink(BOTTLE, i * 25));
const ids = (list: { id: string }[]) => list.map(e => e.id).sort();

test('after a heavy night, its after-effects are still running the next afternoon', () => {
  const fri = friday();
  const { debuffs, nights } = lingeringDebuffs(REF, [fri], at(20 * 60), { calories: true }); // 3 pm Saturday
  assert.ok(ids(debuffs).includes('recovery'));
  assert.ok(ids(debuffs).includes('hangover'));
  for (const e of debuffs) assert.equal(e.carriedFrom, fri[0].t);
  assert.ok(nights.has(fri[0].t));
});

test('lingering after-effects count down instead of restarting', () => {
  const fri = friday();
  const end = (h: number) => lingeringDebuffs(REF, [fri], at(h * 60), { calories: false }).debuffs.find(e => e.id === 'hangover')!.end;
  assert.equal(end(18), end(26));
});

test('nothing lingers once every debuff has run out', () => {
  assert.deepEqual(lingeringDebuffs(REF, [friday()], at(60 * 60), { calories: true }).debuffs, []);
});

test('drinking again stacks with a lingering debuff of the same kind', () => {
  const fri = friday();
  const sat = [drink(BOTTLE, 24 * 60), drink(BOTTLE, 24 * 60 + 30), drink(BOTTLE, 24 * 60 + 60)];
  const now = at(24 * 60 + 70);
  const tonight = effects(simulateNight({ profile: REF, events: sat, now }), { calories: false }).debuffs;
  const lingering = lingeringDebuffs(REF, [fri], now, { calories: false }).debuffs;
  const merged = withLingering(tonight, lingering);
  const rec = merged.debuffs.find(e => e.id === 'recovery')!;
  assert.equal(rec.stacks, 2);
  assert.equal(rec.status, 'active');
  assert.equal(rec.end, Math.max(...[...tonight, ...lingering].filter(e => e.id === 'recovery').map(e => e.end)));
  // Stacked ones move into tonight's list; the rest stay lingering. Nothing appears twice.
  assert.ok(!merged.lingering.some(e => e.id === 'recovery'));
  assert.ok(merged.lingering.some(e => e.id === 'hangover'));
  const all = ids([...merged.debuffs, ...merged.lingering]);
  assert.equal(new Set(all).size, all.length);
});

test('the same debuff from two earlier nights becomes one, stacked', () => {
  const fri = friday();
  const sat = Array.from({ length: 10 }, (_, i) => drink(BOTTLE, 24 * 60 + i * 25));
  const { debuffs } = lingeringDebuffs(REF, [fri, sat], at(44 * 60), { calories: false }); // 3 pm Sunday
  const rec = debuffs.filter(e => e.id === 'recovery');
  assert.equal(rec.length, 1);
  assert.equal(rec[0].stacks, 2);
  assert.equal(rec[0].carriedFrom, sat[0].t);
});
