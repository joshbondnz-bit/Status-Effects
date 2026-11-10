// Foods used to put calories in perspective (never exercise).
import type { SpriteDef } from './sprites';
import type { FoodCompare } from './storage';

export const FOOD: Record<FoodCompare, { kcal: number; one: string; many: string }> = {
  pizza: { kcal: 285, one: 'slice of pizza', many: 'slices of pizza' },
  doughnut: { kcal: 250, one: 'glazed doughnut', many: 'glazed doughnuts' },
  burger: { kcal: 300, one: 'cheeseburger', many: 'cheeseburgers' },
};

const PIZZA: SpriteDef = {
  palette: { o: '#4a2410', C: '#d99a4e', y: '#f6d155', r: '#c8372d' },
  rows: ['oooooooooooo', 'oCCCCCCCCCCo', '.oyyryyyyyo.', '.oyrryyyryo.', '..oyyyyrro..', '..oyyyyyyo..', '...oyryyo...', '...oyyyyo...', '....oyyo....', '....oyyo....', '.....oo.....'],
};

const BURGER: SpriteDef = {
  palette: { o: '#4a2410', B: '#d8913f', w: '#fbe7bf', g: '#5cae3a', M: '#6b3a22', y: '#f6c64a', b: '#c47c33' },
  rows: ['...oooooo...', '.ooBBBBBBoo.', 'oBBwBBBwBBBo', 'oBBBBBBBBBBo', 'gggggggggggg', 'MMMMMMMMMMMM', 'yyyyyyyyyyy.', 'obbbbbbbbbbo', '.oooooooooo.'],
};

/** A ring doughnut, drawn from a little geometry rather than by hand. */
function doughnut(): SpriteDef {
  const sprinkles: Record<string, string> = { '3,2': 's', '7,2': 'y', '2,5': 'g', '9,4': 's', '5,1': 'w', '8,6': 'y', '3,6': 's' };
  const rows: string[] = [];
  for (let y = 0; y < 12; y++) {
    let row = '';
    for (let x = 0; x < 12; x++) {
      const d = Math.hypot(x + 0.5 - 6, y + 0.5 - 6);
      if (d > 5.9 || d < 1.9) { row += '.'; continue; }
      if (d > 5.1 || d < 2.6) { row += 'o'; continue; }
      const icing = y < 7 || (y === 7 && x % 3 !== 0);
      row += icing ? (sprinkles[`${x},${y}`] ?? 'p') : 'd';
    }
    rows.push(row);
  }
  return { rows, palette: { o: '#4a2410', p: '#f08ab8', d: '#cf8a45', s: '#7ad3ff', y: '#fff3a0', g: '#9cf09c', w: '#ffffff' } };
}

export const FOOD_SPRITES: Record<FoodCompare, SpriteDef> = { pizza: PIZZA, doughnut: doughnut(), burger: BURGER };
