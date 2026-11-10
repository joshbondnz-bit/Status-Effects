// Saving and loading the app's data on the device.
//
// Everything lives in one JSON record with a version number. If the format changes later,
// bump DATA_VERSION and add an upgrade step in `upgrade()` so existing users keep their data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LogEvent, Profile } from '../../engine/src/index.ts';

const KEY = 'status-effects/data';
const DATA_VERSION = 2;

export interface SavedNight {
  id: string;
  events: LogEvent[];
  /** When the user tapped End night, if they did. */
  endedAt: number | null;
  /** When the user last answered "someone sober is with me" on the safety check-in. */
  safetyAckAt?: number;
}

export type Units = 'metric' | 'imperial';

export type FoodCompare = 'pizza' | 'doughnut' | 'burger';

export interface Settings {
  /** Show calories and the food-related debuffs. */
  calories: boolean;
  /** How weight and height are shown and entered. The engine always works in kg and cm. */
  units: Units;
  /** What calories are compared with in History. */
  compareWith?: FoodCompare;
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
}

export const DEFAULT_SETTINGS: Settings = { calories: true, units: 'imperial' };

/** Until onboarding exists in the app, this is everyone's starting character. */
export const DEFAULT_PROFILE: Profile = {
  weightKg: 80, heightCm: 178, age: 32, sex: 'm', region: 'ca', bedtime: '23:30', wakeTime: '07:30',
};

export function newNight(): SavedNight {
  return { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, events: [], endedAt: null };
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
