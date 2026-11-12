// Saving and loading the app's data on the device.
//
// Everything lives in one JSON record with a version number. If the format changes later,
// bump DATA_VERSION and add an upgrade step in `upgrade()` so existing users keep their data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CARBS_PER_100ML, costPerDrink, type DrinkCategory, type DrinkSpec, type Feel, type LogEvent, type Profile } from '../../engine/src/index.ts';

const KEY = 'status-effects/data';
const DATA_VERSION = 2;

export interface SavedNight {
  id: string;
  events: LogEvent[];
  /** When the user tapped Call it (stopped drinking for the night), if they did. */
  endedAt: number | null;
  /** When the user last answered "someone sober is with me" on the safety check-in. */
  safetyAckAt?: number;
  /** Morning-after check-in: 0 = great … 4 = wrecked. */
  feel?: Feel;
  /** The morning report was closed without answering. */
  reportClosed?: boolean;
}

export type Units = 'metric' | 'imperial';

export type FoodCompare = 'pizza' | 'doughnut' | 'burger';

export type ThemeChoice = 'system' | 'light' | 'dark';

export interface Settings {
  /** Show calories and the food-related debuffs. */
  calories: boolean;
  /** How weight and height are shown and entered. The engine always works in kg and cm. */
  units: Units;
  /** What calories are compared with in History. */
  compareWith?: FoodCompare;
  /** Colour theme: follow the phone's light/dark setting (the default), or always light or dark. */
  theme?: ThemeChoice;
  /** What the app calls you ("Morning, Josh"). Optional; stays on the device. */
  name?: string;
}

/** First-run setup: not seen yet, finished, or skipped (using the default character). */
export type SetupState = 'pending' | 'done' | 'skipped';

export interface AppData {
  version: number;
  setup: SetupState;
  profile: Profile;
  settings: Settings;
  tonight: SavedNight;
  /** Finished nights, oldest first. History will be built from these. */
  past: SavedNight[];
  /** When this device started tracking, so History can count alcohol-free days from day one. */
  trackingSince: number;
  /** The most recent AUDIT-C check-in, if any. */
  audit?: { score: number; at: number };
  /** When the safety screen (estimates only, never drink and drive) was acknowledged. Shown once until then. */
  safetyAckAt?: number;
  /** Drinks the user has saved for one-tap logging, newest first. */
  myDrinks?: SavedDrink[];
}

/** How a saved drink is priced: per drink, or as a pack that's split across its drinks. */
export type Price = { per: 'drink'; amount: number } | { per: 'pack'; amount: number; count: number };

/** A drink in "My drinks". */
export interface SavedDrink {
  id: string;
  name: string;
  size?: string;
  ml: number;
  abv: number;
  category: DrinkCategory;
  /** Calories from the label, if the user entered them; otherwise estimated. */
  kcal?: number;
  price?: Price;
  /** For packs: how many are left at home, counting down as they're logged. Undefined = not tracked. */
  left?: number;
}

/** Price of one drink. */
export function unitPrice(p?: Price): number | undefined {
  if (!p) return undefined;
  return p.per === 'drink' ? p.amount : costPerDrink(p.amount, p.count);
}

/** Turn a saved drink into something the engine can log. */
export function savedToSpec(d: SavedDrink): DrinkSpec {
  return {
    name: d.name, size: d.size, ml: d.ml, abv: d.abv, category: d.category,
    carbPer100ml: DEFAULT_CARBS_PER_100ML[d.category], kcal: d.kcal ?? null, cost: unitPrice(d.price),
  };
}

function isSavedDrink(x: any): x is SavedDrink {
  return !!x && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.ml === 'number' && typeof x.abv === 'number';
}

export const DEFAULT_SETTINGS: Settings = { calories: true, units: 'imperial' };

/** Until onboarding exists in the app, this is everyone's starting character. */
export const DEFAULT_PROFILE: Profile = {
  weightKg: 80, heightCm: 178, age: 32, sex: 'm', region: 'ca', bedtime: '23:30', wakeTime: '07:30',
};

export function newNight(): SavedNight {
  return { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, events: [], endedAt: null };
}

/**
 * Wipe the drinking history: every night (tonight included), morning check-ins, the AUDIT-C score, and the
 * streak and achievement counts (tracking starts again from `now`). Keeps the character, settings and My drinks.
 */
export function clearHistory(d: AppData, now: number): AppData {
  return { ...d, tonight: newNight(), past: [], trackingSince: now, audit: undefined };
}

export function defaultData(): AppData {
  return { version: DATA_VERSION, setup: 'pending', profile: DEFAULT_PROFILE, settings: DEFAULT_SETTINGS, tonight: newNight(), past: [], trackingSince: Date.now() };
}

function isNight(x: unknown): x is SavedNight {
  const n = x as SavedNight;
  return !!n && typeof n.id === 'string' && Array.isArray(n.events);
}

/**
 * Bring older saved formats up to date, one version at a time.
 * v1 → v2: added `setup` and `settings`. Version 1 users never saw setup, so they get it now.
 */
function upgrade(raw: any): AppData | null {
  if (!raw || typeof raw !== 'object' || typeof raw.version !== 'number') return null;
  if (raw.version === 1) raw = { ...raw, version: 2, setup: 'pending', settings: DEFAULT_SETTINGS };
  if (raw.version !== DATA_VERSION) return null;
  if (!isNight(raw.tonight) || !Array.isArray(raw.past)) return null;
  const setup: SetupState = raw.setup === 'done' || raw.setup === 'skipped' ? raw.setup : 'pending';
  // Added later as an optional field: fall back to the earliest thing ever logged.
  const allTimes = [raw.tonight, ...raw.past].flatMap((n: SavedNight) => n.events.map(e => e.t)).filter(Number.isFinite);
  const trackingSince = typeof raw.trackingSince === 'number' ? raw.trackingSince : allTimes.length ? Math.min(...allTimes) : Date.now();
  return {
    trackingSince,
    version: DATA_VERSION,
    setup,
    profile: { ...DEFAULT_PROFILE, ...(raw.profile ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
    tonight: { ...raw.tonight, endedAt: raw.tonight.endedAt ?? null },
    past: raw.past.filter(isNight),
    audit: raw.audit && typeof raw.audit.score === 'number' && typeof raw.audit.at === 'number' ? raw.audit : undefined,
    myDrinks: Array.isArray(raw.myDrinks) ? raw.myDrinks.filter(isSavedDrink) : [],
    safetyAckAt: typeof raw.safetyAckAt === 'number' ? raw.safetyAckAt : undefined,
  };
}

export async function loadData(): Promise<AppData> {
  const json = await AsyncStorage.getItem(KEY);
  if (json == null) return defaultData();
  try {
    const data = upgrade(JSON.parse(json));
    if (data) return data;
  } catch {
    // fall through
  }
  // Unreadable data: keep a copy rather than losing it silently, then start fresh.
  await AsyncStorage.setItem(`${KEY}.unreadable.${Date.now()}`, json);
  return defaultData();
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
