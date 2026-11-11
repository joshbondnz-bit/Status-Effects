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
/** A kind of drink without a size (Lager 5%); the size is picked separately from SERVING_SIZES. */
export type DrinkType = Omit<DrinkSpec, 'ml' | 'size'>;

/** Drink types for the drink sheet. Mixed drinks keep their fixed PRESETS sizes instead. */
export const DRINK_TYPES: Record<'beer' | 'wine' | 'spirits', DrinkType[]> = {
  beer: [
    { name: 'Lager', abv: 5, carbPer100ml: 3.0 },
    { name: 'Light beer', abv: 4, carbPer100ml: 2.0 },
    { name: 'IPA', abv: 6.5, carbPer100ml: 4.0 },
    { name: 'Double IPA', abv: 8.5, carbPer100ml: 5.5 },
    { name: 'Stout', abv: 4.2, carbPer100ml: 3.5 },
    { name: 'Cider', abv: 4.5, carbPer100ml: 5.0 },
    { name: 'Hard seltzer', abv: 5, carbPer100ml: 0.5 },
  ],
  wine: [
    { name: 'Red wine', abv: 13.5, carbPer100ml: 0.8 },
    { name: 'White wine', abv: 12, carbPer100ml: 1.2 },
    { name: 'Rosé', abv: 12, carbPer100ml: 1.5 },
    { name: 'Prosecco', abv: 11, carbPer100ml: 1.5 },
  ],
  spirits: [
    { name: 'Vodka or gin', abv: 40, carbPer100ml: 0 },
    { name: 'Whisky', abv: 40, carbPer100ml: 0 },
    { name: 'Rum', abv: 40, carbPer100ml: 0 },
    { name: 'Tequila', abv: 38, carbPer100ml: 0 },
  ],
};
for (const [category, list] of Object.entries(DRINK_TYPES) as [DrinkCategory, DrinkType[]][]) {
  for (const t of list) t.category = category;
}

export interface ServingSize { label: string; ml: number }

const OZ_WINE: ServingSize[] = [{ label: 'Standard pour, 5 oz', ml: 148 }, { label: 'Large pour, 9 oz', ml: 266 }, { label: 'Small pour, 3 oz', ml: 89 }, { label: 'Bottle', ml: 750 }];
const ML_WINE: ServingSize[] = [{ label: 'Medium glass', ml: 175 }, { label: 'Large glass', ml: 250 }, { label: 'Small glass', ml: 125 }, { label: 'Bottle', ml: 750 }];

/** The usual serving sizes in each region, most common first. */
export const SERVING_SIZES: Record<'beer' | 'wine' | 'spirits', Record<RegionCode, ServingSize[]>> = {
  beer: {
    // Canada: plain names, no ounces (the ml shows on every size tile).
    ca: [{ label: 'Bottle', ml: 341 }, { label: 'Can', ml: 355 }, { label: 'Tallboy', ml: 473 }, { label: 'Pint', ml: 568 }, { label: 'Small glass', ml: 355 }],
    us: [{ label: 'Can, 12 oz', ml: 355 }, { label: 'Bottle, 12 oz', ml: 355 }, { label: 'Pint, 16 oz', ml: 473 }, { label: 'Tallboy, 16 oz', ml: 473 }, { label: 'Large draft, 20 oz', ml: 591 }],
    uk: [{ label: 'Pint', ml: 568 }, { label: 'Half pint', ml: 284 }, { label: 'Bottle', ml: 330 }, { label: 'Can', ml: 440 }, { label: 'Small can', ml: 330 }],
    au: [{ label: 'Schooner', ml: 425 }, { label: 'Pint', ml: 570 }, { label: 'Middy or pot', ml: 285 }, { label: 'Stubby', ml: 375 }, { label: 'Can', ml: 375 }],
    nz: [{ label: 'Handle', ml: 425 }, { label: 'Pint', ml: 568 }, { label: 'Bottle', ml: 330 }, { label: 'Can', ml: 330 }, { label: 'Can', ml: 440 }, { label: 'Half pint', ml: 284 }],
    eu: [{ label: 'Large, 0.5 L', ml: 500 }, { label: 'Bottle, 0.33 L', ml: 330 }, { label: 'Medium, 0.4 L', ml: 400 }, { label: 'Small, 0.25 L', ml: 250 }],
  },
  wine: { ca: [{ label: 'Standard glass', ml: 148 }, { label: 'Large glass', ml: 266 }, { label: 'Small glass', ml: 89 }, { label: 'Bottle', ml: 750 }], us: OZ_WINE, uk: ML_WINE, au: [{ label: 'Glass', ml: 150 }, ...ML_WINE.slice(1)], nz: [{ label: 'Glass', ml: 150 }, ...ML_WINE.slice(1)], eu: ML_WINE },
  spirits: {
    ca: [{ label: 'Shot', ml: 43 }, { label: 'Double', ml: 85 }, { label: 'Small shot', ml: 28 }],
    us: [{ label: 'Shot, 1.5 oz', ml: 44 }, { label: 'Double, 3 oz', ml: 89 }, { label: 'Single, 1 oz', ml: 30 }],
    uk: [{ label: 'Single', ml: 25 }, { label: 'Double', ml: 50 }, { label: 'Large single', ml: 35 }],
    au: [{ label: 'Nip', ml: 30 }, { label: 'Double', ml: 60 }],
    nz: [{ label: 'Nip', ml: 30 }, { label: 'Double', ml: 60 }],
    eu: [{ label: 'Single, 4 cl', ml: 40 }, { label: 'Small, 2 cl', ml: 20 }, { label: 'Double, 8 cl', ml: 80 }],
  },
};

/** A drink type in a given serving size, ready to log. */
export const withSize = (t: DrinkType, s: ServingSize): DrinkSpec => ({ ...t, size: s.label, ml: s.ml });

/** Spirits for the build-your-own mixed drink. */
export const MIX_SPIRITS = [
  { name: 'Vodka', abv: 40 }, { name: 'Gin', abv: 40 }, { name: 'Rum', abv: 40 },
  { name: 'Whisky', abv: 40 }, { name: 'Tequila', abv: 38 }, { name: 'Liqueur', abv: 20 },
] as const;

/** Common mixers, with typical sugar per 100 ml (estimates; it only affects calories). */
export const MIXERS = [
  { name: 'Cola', carbPer100ml: 10.6 }, { name: 'Diet cola', carbPer100ml: 0 }, { name: 'Lemonade', carbPer100ml: 10 },
  { name: 'Tonic', carbPer100ml: 8.8 }, { name: 'Soda water', carbPer100ml: 0 }, { name: 'Ginger beer', carbPer100ml: 10 },
  { name: 'Orange juice', carbPer100ml: 8.8 },
] as const;

/** How much mixer goes in a mixed drink. */
export const MIXER_ML = 150;

/** One measure of spirits in your region (a single shot); a double is twice this. */
export const shotMl = (region: RegionCode): number => SERVING_SIZES.spirits[region][0].ml;

/**
 * A mixed drink from its spirits and an optional mixer: total volume, ABV and the mixer's sugar.
 * The alcohol is what matters for blood alcohol; the mixer only adds volume and calories.
 */
export function mixDrink(name: string, size: string, spirits: { abv: number; ml: number }[], mixer: { carbPer100ml: number } | null): DrinkSpec {
  const mixerMl = mixer ? MIXER_ML : 0;
  const spiritMl = spirits.reduce((t, s) => t + s.ml, 0);
  const alcoholMl = spirits.reduce((t, s) => t + (s.ml * s.abv) / 100, 0);
  const ml = spiritMl + mixerMl;
  return {
    name, size, ml, category: 'mixed',
    abv: Math.round((alcoholMl / ml) * 1000) / 10,
    carbs: mixer ? (mixerMl * mixer.carbPer100ml) / 100 : 0,
  };
}

for (const [category, list] of Object.entries(PRESETS) as [DrinkCategory, DrinkSpec[]][]) {
  for (const spec of list) spec.category = category;
}
