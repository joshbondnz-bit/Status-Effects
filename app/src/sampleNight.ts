// A sample night ending at `t`: dinner, two pints, an IPA, a water, then a double whisky.
import { MIN, PRESETS, makeDrink, type LogEvent } from '../../engine/src/index.ts';

let seq = 0;
export const newId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function sampleNightEvents(t: number): LogEvent[] {
  return [
    { type: 'food', id: newId(), t: t - 170 * MIN },
    makeDrink(PRESETS.beer[0], t - 130 * MIN, newId()),
    makeDrink(PRESETS.beer[0], t - 85 * MIN, newId()),
    makeDrink(PRESETS.beer[3], t - 45 * MIN, newId()),
    { type: 'water', id: newId(), t: t - 30 * MIN },
    makeDrink(PRESETS.spirits[1], t - 10 * MIN, newId()),
  ];
}
