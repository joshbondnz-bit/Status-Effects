import type { DrinkCategory, DrinkEvent, DrinkSpec, RegionCode } from './types.ts';

/** Density of ethanol, g/ml. */
export const ETHANOL_DENSITY = 0.789;
/** Energy in alcohol and carbohydrate, kcal per gram. */
export const KCAL_PER_G_ALCOHOL = 7;
export const KCAL_PER_G_CARB = 4;

export interface Region {
  /** Grams of alcohol in one standard drink (or UK unit). */
  gramsPerStandardDrink: number;
  /** Plural label for display: "standard drinks" or "units". */
  unitLabel: string;
}

export const REGIONS: Record<RegionCode, Region> = {
  ca: { gramsPerStandardDrink: 13.45, unitLabel: 'standard drinks' },
  us: { gramsPerStandardDrink: 14, unitLabel: 'standard drinks' },
  uk: { gramsPerStandardDrink: 8, unitLabel: 'units' },
  au: { gramsPerStandardDrink: 10, unitLabel: 'standard drinks' },
  nz: { gramsPerStandardDrink: 10, unitLabel: 'standard drinks' },
  eu: { gramsPerStandardDrink: 10, unitLabel: 'standard drinks' },
};

/** Grams of pure alcohol in a drink. */
export function alcoholGrams(ml: number, abvPercent: number): number {
  return ml * (abvPercent / 100) * ETHANOL_DENSITY;
}

/** How many standard drinks (or UK units) a number of grams is. */
export function standardDrinks(grams: number, region: RegionCode): number {
  return grams / REGIONS[region].gramsPerStandardDrink;
}

/** Turn a drink spec into a logged drink at time t. */
export function makeDrink(spec: DrinkSpec, t: number, id: string): DrinkEvent {
  const grams = alcoholGrams(spec.ml, spec.abv);
  const carbs = spec.carbs ?? (spec.ml * (spec.carbPer100ml ?? 0)) / 100;
  let kcalFromAlcohol = Math.round(grams * KCAL_PER_G_ALCOHOL);
  const kcal = spec.kcal != null ? Math.round(spec.kcal) : Math.round(grams * KCAL_PER_G_ALCOHOL + carbs * KCAL_PER_G_CARB);
  if (spec.kcal != null) kcalFromAlcohol = Math.min(kcalFromAlcohol, kcal);
  return {
    type: 'drink', id, t,
    name: spec.name, size: spec.size, ml: spec.ml, abv: spec.abv, category: spec.category,
    grams, kcal, kcalFromAlcohol,
    ...(spec.cost != null && spec.cost > 0 ? { cost: Math.round(spec.cost * 100) / 100 } : {}),
  };
}

/** Price of one drink from a pack (e.g. a 6-pack for $18 is $3 a drink). */
export function costPerDrink(packPrice: number, count: number): number {
  return count > 0 ? Math.round((packPrice / count) * 100) / 100 : 0;
}

/** Rough carbohydrate per 100 ml by category, for custom drinks without a label. */
export const DEFAULT_CARBS_PER_100ML: Record<DrinkCategory, number> = { beer: 3.5, wine: 1.2, spirits: 0, mixed: 8 };

/** Best guess at a drink's category from its name, for drinks logged without one. */
export function guessCategory(name: string): DrinkCategory {
  const n = name.toLowerCase();
  if (/wine|ros|prosecco|champ/.test(n)) return 'wine';
  if (/tonic|cola|spritz|margarita|martini|cocktail|mojito|negroni/.test(n)) return 'mixed';
  if (/vodka|gin|whisk|tequila|rum|spirit|shot|bourbon/.test(n)) return 'spirits';
  return 'beer';
}

/** Built-in drink presets. Carbs are rough averages for estimating calories. */
export const PRESETS: Record<DrinkCategory, DrinkSpec[]> = {
  beer: [
    { name: 'Lager', size: 'Pint', ml: 568, abv: 4.5, carbPer100ml: 3.0 },
    { name: 'Lager', size: 'Bottle', ml: 341, abv: 5, carbPer100ml: 3.0 },
    { name: 'Lager', size: 'Tallboy', ml: 473, abv: 5, carbPer100ml: 3.0 },
    { name: 'IPA', size: 'Can', ml: 440, abv: 6.5, carbPer100ml: 4.0 },
    { name: 'Double IPA', size: 'Can', ml: 440, abv: 8.5, carbPer100ml: 5.5 },
    { name: 'Stout', size: 'Pint', ml: 568, abv: 4.2, carbPer100ml: 3.5 },
    { name: 'Cider', size: 'Pint', ml: 568, abv: 4.5, carbPer100ml: 5.0 },
  ],
  wine: [
    { name: 'Red wine', size: 'Medium glass', ml: 175, abv: 13.5, carbPer100ml: 0.8 },
    { name: 'White wine', size: 'Medium glass', ml: 175, abv: 12, carbPer100ml: 1.2 },
    { name: 'White wine', size: 'Large glass', ml: 250, abv: 12, carbPer100ml: 1.2 },
    { name: 'Rosé', size: 'Medium glass', ml: 175, abv: 12, carbPer100ml: 1.5 },
    { name: 'Prosecco', size: 'Flute', ml: 125, abv: 11, carbPer100ml: 1.5 },
  ],
  spirits: [
    { name: 'Vodka or gin', size: 'Single, 25 ml', ml: 25, abv: 40, carbPer100ml: 0 },
    { name: 'Whisky', size: 'Double, 50 ml', ml: 50, abv: 40, carbPer100ml: 0 },
    { name: 'Tequila', size: 'Shot, 30 ml', ml: 30, abv: 38, carbPer100ml: 0 },
    { name: 'Spirit', size: '1.5 oz pour, 43 ml', ml: 43, abv: 40, carbPer100ml: 0 },
  ],
  mixed: [
    { name: 'Gin and tonic', size: 'Double + 150 ml tonic', ml: 200, abv: 10, carbs: 13 },
    { name: 'Rum and cola', size: 'Double + 200 ml cola', ml: 250, abv: 8, carbs: 21 },
    { name: 'Aperol spritz', size: 'Wine glass', ml: 200, abv: 8, carbs: 14 },
    { name: 'Margarita', size: 'Coupe', ml: 150, abv: 13, carbs: 15 },
    { name: 'Espresso martini', size: 'Coupe', ml: 125, abv: 19, carbs: 18 },
  ],
};
for (const [category, list] of Object.entries(PRESETS) as [DrinkCategory, DrinkSpec[]][]) {
  for (const spec of list) spec.category = category;
}
