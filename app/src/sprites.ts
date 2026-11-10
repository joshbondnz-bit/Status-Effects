// Pixel art as text grids: each character is a palette colour, '.' is transparent.
// PixelSprite adds a 1px dark outline automatically.
import type { DrinkEvent, EffectId } from '../../engine/src/index.ts';
import { guessCategory } from '../../engine/src/index.ts';

export interface SpriteDef { rows: string[]; palette: Record<string, string>; }

const E = '................';

export const ICONS: Record<EffectId, SpriteDef> = {
  sleep: { palette: { m: '#f2d98a', M: '#c9a24a', z: '#b9b4ff' }, rows: [E,
    '.........zzzz...', '...........z....', '.....mmm..z.....', '...mmmm..zzzz...', '..mmmm..........', '..mmm......zzz..', '.mmmm.......z...',
    '.mmmm......zzz..', '.mmmm...........', '.mmmmm..........', '..mmmmm.....mm..', '..MmmmmmmmmmMm..', '...MMmmmmmmMM...', '.....MMMMMM.....', E] },
  judgment: { palette: { p: '#f29bb8', P: '#c9607f', d: '#c9607f', y: '#f2c14e' }, rows: [E,
    '..y..........y..', '.yyy........yyy.', '..y...pppp...y..', '....ppPppPpp....', '...pPpppppPpp...', '..ppppPpppppPp..', '..pPppppPppppp..',
    '..ppppPppPpppp..', '...pPpppppPpp...', '....pppPpppp....', '.......dd.......', '.......dd.......', E, E, E] },
  hrv: { palette: { r: '#e5484f', h: '#ff9a86', R: '#a3243a', w: '#fff1e6' }, rows: [E, E,
    '...rrr....rrr...', '..rhrrr..rrrrr..', '.rhhrrrrrrrrrrr.', '.rhrrrrwrrrrrrr.', '.rrrrrrwrrrrrrR.', '.rrrrrrwrrrrrrR.',
    'wwwwwwwwwwwwwwww', '...rrrrrwrrRR...', '....rrrrwrRR....', '.....rrrrRR.....', '......rrRR......', '.......RR.......', E, E] },
  dehydration: { palette: { b: '#8fb4cc', h: '#d5e8f4', B: '#5d7f99', c: '#3a2a1f' }, rows: [E,
    '.......bb.......', '......bbbb......', '......bhbb......', '.....bhbbbb.....', '.....hbbbbb.....', '....bhbbcbbb....', '....hbbbbcbb....',
    '...bhbbbcbbbb...', '...bbbbbbcbbb...', '...bbbbbcbbbB...', '...bbbbbbbbbB...', '....bbbbbbbB....', '.....BBBBBB.....', E, E] },
  hangover: { palette: { g: '#a8c46a', G: '#71913a', e: '#24301a' }, rows: [E,
    '.....gggggg.....', '...gggggggggg...', '..gggggggggggg..', '..gggggggggggg..', '.gggeeggggeeggg.', '.gggggggggggggg.', '.gggggggggggggg.',
    '.ggggegegegggGg.', '.gggggegegeggGg.', '..ggggggggggGG..', '..gggggggggGGG..', '...gggggggGGG...', '.....GGGGGG.....', E, E] },
  hangxiety: { palette: { c: '#9b8fc4', C: '#6b5f99', y: '#f2c14e', b: '#6f93ff' }, rows: [E, E,
    '......ccc.......', '....ccccccc.....', '..ccccccccccc...', '.ccccccccccccc..', '.cccccccccccccc.', '.CCCCCCCCCCCCCC.',
    '......yy........', '.....yy...b.....', '....yyyy........', '......yy....b...', '.....yy.........', '.....y..........', E, E] },
  recovery: { palette: { h: '#c3cad6', W: '#7f8a9c', b: '#9aa3b2', B: '#5d6573' }, rows: [E, E, E, E,
    '.hh..........hh.', '.hhW........hhW.', '.hhW........hhW.', '.hhWbbbbbbbbhhW.', '.hhWBBBBBBBBhhW.', '.hhW........hhW.', '.hhW........hhW.', '.WW..........WW.', E, E, E, E] },
  fatpause: { palette: { f: '#ff7a2e', y: '#ffd166', P: '#5a1f0c' }, rows: [E,
    '......f.........', '......ff........', '.....fff........', '.....ffff..f....', '....fffff.ff....', '...ffffffffff...', '...ffyyyyyyff...',
    '..ffyyyyyyyyff..', '..ffyyPyyPyyff..', '..ffyyPyyPyyff..', '..ffyyPyyPyyff..', '...ffyyyyyyff...', '....ffffffff....', E, E] },
  munchies: { palette: { o: '#4a2410', B: '#d8913f', w: '#fbe7bf', g: '#5cae3a', M: '#6b3a22', y: '#f6c64a', b: '#c47c33' }, rows: [E, E, E,
    E, '.....oooooo.....', '...ooBBBBBBoo...', '..oBBwBBBwBBBo..', '..oBBBBBBBBBBo..', '..gggggggggggg..', '..MMMMMMMMMMMM..', '..yyyyyyyyyyy...', '..obbbbbbbbbbo..', '...oooooooooo...', E, E, E] },
  hydrated: { palette: { g: '#cfe6ff', a: '#3d4a6b', w: '#bfe3ff', b: '#4aa3f0', h: '#a8d8ff' }, rows: [E, E,
    '...gaaaaaaaag...', '...gaaaaaaaag...', '...gwwwwwwwwg...', '...gbbbbbbbbg...', '....gbbbbbbg....', '....gbbbbbbg....', '....gbhbbbbg....',
    '....gbbbbbbg....', '....gbbbbbbg....', '.....gbbbbg.....', '.....gggggg.....', E, E, E] },
  lined: { palette: { c: '#b0703a', b: '#f3d9a4' }, rows: [E, E,
    '....cccccccc....', '..cccccccccccc..', '.ccbbbbbbbbbbcc.', '.cbbbbbbbbbbbbc.', '.cbbbbbbbbbbbbc.', '..cbbbbbbbbbbc..', '..cbbbbbbbbbbc..',
    '..cbbbbbbbbbbc..', '..cbbbbbbbbbbc..', '..cbbbbbbbbbbc..', '..cccccccccccc..', E, E, E] },
  pace: { palette: { w: '#c08a52', g: '#cfe6ff', a: '#3d4a6b', s: '#f2c14e' }, rows: [E,
    '..wwwwwwwwwwww..', '...gaaaaaaaag...', '...gssssssssg...', '....gssssssg....', '.....gssssg.....', '......gssg......', '.......ss.......',
    '......gssg......', '.....gassag.....', '....gaassaag....', '...gaassssaag...', '...gssssssssg...', '..wwwwwwwwwwww..', E, E] },
  // A heart with a crack through it.
  strain: { palette: { r: '#b3132b', h: '#e5484f', R: '#6e0d1c', c: '#100c18' }, rows: [E, E,
    '...rrr....rrr...', '..rhrrr..rrcrr..', '.rhhrrrrrrrcrrr.', '.rhrrrrrrrcrrrr.', '.rrrrrrrrrcrrrR.', '.rrrrrrrrcrrrrR.',
    '..rrrrrrrrcrrR..', '...rrrrrrcrRR...', '....rrrrcrRR....', '.....rrrcRR.....', '......rrRR......', '.......RR.......', E, E] },
  called: { palette: { y: '#f2c14e', h: '#fff1b0', Y: '#b8862a' }, rows: [E, E,
    '...yyyyyyyyyy...', '.yyyhyyyyyyyYyy.', '.y.yhyyyyyyyY.y.', '.y.yhyyyyyyyY.y.', '..yyhyyyyyyyYy..', '....yyyyyyyY....', '.....yyyyyY.....',
    '......yyyY......', '.......yY.......', '.......yY.......', '.....yyyyyY.....', '....YYYYYYYY....', E, E] },
};

export const HEART: SpriteDef = {
  palette: { R: '#e5484f', h: '#ff9a86' },
  rows: ['.RR.RR.', 'hRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'],
};

/** Options tab icon; tinted to match the tab state. */
export function gearSprite(color: string): SpriteDef {
  return {
    palette: { g: color },
    rows: ['...g.g...', '..ggggg..', '.ggg.ggg.', 'gg.....gg', '.gg...gg.', 'gg.....gg', '.ggg.ggg.', '..ggggg..', '...g.g...'],
  };
}

/** History tab icon: a little calendar page. */
export function calendarSprite(color: string): SpriteDef {
  return {
    palette: { g: color, r: '#e5484f', w: '#2f2945', d: color },
    rows: ['.g.....g.', 'rrrrrrrrr', 'rrrrrrrrr', 'gwwwwwwwg', 'gwdwdwdwg', 'gwwwwwwwg', 'gwdwdwwwg', 'gwwwwwwwg', 'ggggggggg'],
  };
}

// Drink tally glasses. L/H/D are the drink's liquid colour, its highlight and its shade.
const GLASSES: Record<'pint' | 'bottle' | 'wine' | 'shot' | 'cocktail', string[]> = {
  pint: ['.wwwwwww.', 'wwwwwwwww', 'gLLLLLLLg', 'gLHLLLLLg', 'gLHLLLLLg', 'gLLLLLLDg', '.gLLLLDg.', '.gLLLLDg.', '.gLLLLDg.', '.ggggggg.'],
  bottle: ['..kk..', '..bb..', '..bb..', '.bbbb.', 'bhbbbB', 'bhbbbB', 'llllll', 'llllll', 'bhbbbB', 'bhbbbB', 'BBBBBB'],
  wine: ['aeeeeeeea', 'aLLLLLLLa', 'aLHLLLLDa', '.aLLLLDa.', '..aLLDa..', '...aaa...', '....a....', '....a....', '..aaaaa..'],
  shot: ['aeeeeea', 'aLLLLLa', 'aHLLLDa', 'aLLLLDa', '.aaaaa.'],
  cocktail: ['aaaaaaaaa', 'aLLLLLLLa', '.aLHLLDa.', '..aLLDa..', '...aLa...', '....a....', '....a....', '..aaaaa..'],
};
const GLASS_PALETTE = { a: '#aab4d6', g: '#aab4d6', e: '#3a3a5a', w: '#fff3dc', k: '#c9ced8', b: '#7a4a22', h: '#b07a44', B: '#4a2a12', l: '#f0e5cd' };

export function mixHex(c: string, to: string, f: number): string {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const a = p(c), b = p(to);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, '0')).join('');
}

function liquidFor(d: DrinkEvent): string {
  const n = d.name.toLowerCase();
  const table: [RegExp, string][] = [[/stout|porter|espresso/, '#3b2418'], [/cola/, '#5a2a1a'], [/red wine/, '#8e1f3a'], [/ros/, '#f08da0'],
    [/white|prosecco|champ/, '#e9dd8a'], [/whisk|bourbon|rum/, '#c97f2b'], [/aperol|spritz/, '#f27a2a'], [/margarita/, '#cfe08a'],
    [/cider/, '#f0c75a'], [/vodka|gin|tequila|tonic/, '#d8ecf5']];
  for (const [re, c] of table) if (re.test(n)) return c;
  const cat = d.category ?? guessCategory(d.name);
  return cat === 'wine' ? '#8e1f3a' : cat === 'spirits' ? '#c97f2b' : cat === 'mixed' ? '#e46fa0' : '#e8a73a';
}

export function glassSprite(d: DrinkEvent): SpriteDef {
  const cat = d.category ?? guessCategory(d.name);
  const kind = cat === 'wine' ? 'wine' : cat === 'spirits' ? 'shot' : cat === 'mixed' ? 'cocktail' : d.ml >= 500 ? 'pint' : 'bottle';
  const L = liquidFor(d);
  return { rows: GLASSES[kind], palette: { ...GLASS_PALETTE, L, H: mixHex(L, '#ffffff', 0.45), D: mixHex(L, '#000000', 0.3) } };
}
