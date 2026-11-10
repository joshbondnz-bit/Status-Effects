import { makeDrink, PRESETS, MIN, type Profile, type LogEvent, type DrinkSpec } from '../src/index.ts';

/** A reference person used across tests. */
export const REF: Profile = {
  weightKg: 80, heightCm: 178, age: 32, sex: 'm', region: 'ca', bedtime: '23:30', wakeTime: '07:30',
};

/** 7:00 pm on a fixed date, so tests never depend on today's date. */
export const EVENING = new Date(2026, 10, 6, 19, 0, 0, 0).getTime();
export const at = (minutesAfter7pm: number) => EVENING + minutesAfter7pm * MIN;

let n = 0;
export const drink = (spec: DrinkSpec, minutes: number): LogEvent => makeDrink(spec, at(minutes), 'd' + n++);
export const food = (minutes: number): LogEvent => ({ type: 'food', id: 'f' + n++, t: at(minutes) });
export const water = (minutes: number): LogEvent => ({ type: 'water', id: 'w' + n++, t: at(minutes) });

/** One Canadian standard drink: a 341 ml bottle of 5% beer. */
export const BOTTLE = PRESETS.beer[1];
