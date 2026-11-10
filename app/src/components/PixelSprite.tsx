import { memo, useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';
import type { SpriteDef } from '../sprites';

const OUTLINE = '#100c18';

function drained(hex: string): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const v = Math.round((0.3 * r + 0.59 * g + 0.11 * b) * 0.3 + 38);
  const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return '#' + h(v) + h(v - 4) + h(v + 16);
}

interface Props {
  sprite: SpriteDef;
  /** Screen pixels per sprite pixel. */
  scale: number;
  /** 0–1: rows above this level are drawn greyed out (a draining countdown). */
  fill?: number;
  dim?: boolean;
}

/** Draws a text-grid sprite as crisp SVG rectangles, merging runs of the same colour. */
function PixelSpriteInner({ sprite, scale, fill = 1, dim = false }: Props) {
  const { rows, palette } = sprite;
  const H = rows.length, W = Math.max(...rows.map(r => r.length));
  const rects = useMemo(() => {
    const at = (x: number, y: number) => (y >= 0 && y < H && x >= 0 && x < rows[y].length ? rows[y][x] : '.');
    let top = H, bot = -1;
    rows.forEach((r, y) => { if (/[^.]/.test(r)) { top = Math.min(top, y); bot = Math.max(bot, y); } });
    const level = bot + 1 - Math.round(Math.max(0, Math.min(1, fill)) * (bot - top + 1));
    const out: { x: number; y: number; w: number; c: string }[] = [];
    for (let y = -1; y <= H; y++) {
      let run: { x: number; c: string; w: number } | null = null;
      for (let x = -1; x <= W + 1; x++) {
        const ch = at(x, y);
        let c: string | null = null;
        if (ch === '.') {
          if (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.') c = OUTLINE;
        } else if (palette[ch]) {
          c = y < level ? drained(palette[ch]) : palette[ch];
        }
        if (run && run.c === c) { run.w++; continue; }
        if (run && run.c) out.push({ x: run.x, y, w: run.w, c: run.c });
        run = c ? { x, c, w: 1 } : null;
      }
      if (run) out.push({ x: run.x, y, w: run.w, c: run.c });
    }
    return out;
  }, [rows, palette, fill, H, W]);

  return (
    <Svg width={(W + 2) * scale} height={(H + 2) * scale} viewBox={`0 0 ${W + 2} ${H + 2}`} opacity={dim ? 0.5 : 1}>
      {rects.map((r, i) => (
        <Rect key={i} x={r.x + 1} y={r.y + 1} width={r.w} height={1} fill={r.c} />
      ))}
    </Svg>
  );
}

export const PixelSprite = memo(PixelSpriteInner);
