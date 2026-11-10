// Shared types for the Status Effects engine.
// Times are milliseconds since the Unix epoch (what Date.now() returns).

export type Sex = 'm' | 'f';
export type RegionCode = 'ca' | 'us' | 'uk' | 'au' | 'eu';
export type DrinkCategory = 'beer' | 'wine' | 'spirits' | 'mixed';

/** The user's "character sheet". */
export interface Profile {
  weightKg: number;
  heightCm: number;
  age: number;
  /** Only used to pick the body-water formula. */
  sex: Sex;
  region: RegionCode;
  /** "HH:MM", 24-hour clock. */
  bedtime: string;
  /** "HH:MM", 24-hour clock. */
  wakeTime: string;
}

/** What a drink is, before it's logged (a preset, a saved drink, a custom entry). */
export interface DrinkSpec {
  name: string;
  size?: string;
  ml: number;
  /** Alcohol by volume, as a percentage (5 means 5%). */
  abv: number;
  /** Carbohydrate per 100 ml, used to estimate calories. */
  carbPer100ml?: number;
  /** Total carbohydrate in grams; overrides carbPer100ml (handy for cocktails). */
  carbs?: number;
  /** Calories from the label; overrides the estimate. */
  kcal?: number | null;
  category?: DrinkCategory;
}

export interface DrinkEvent {
  type: 'drink';
  id: string;
  t: number;
  name: string;
  size?: string;
  ml: number;
  abv: number;
  category?: DrinkCategory;
  /** Grams of pure alcohol. */
  grams: number;
  kcal: number;
  kcalFromAlcohol: number;
  /** Money paid for this drink, if logged. */
  cost?: number;
}

export interface WaterEvent { type: 'water'; id: string; t: number; }
export interface FoodEvent { type: 'food'; id: string; t: number; }

export type LogEvent = DrinkEvent | WaterEvent | FoodEvent;

/** 0 = minor, 1 = moderate, 2 = severe. */
export type Severity = 0 | 1 | 2;
