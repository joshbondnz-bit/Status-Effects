// Saving and loading the app's data on the device.
//
// Everything lives in one JSON record with a version number. If the format changes later,
// bump DATA_VERSION and add an upgrade step in `upgrade()` so existing users keep their data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LogEvent, Profile } from '../../engine/src/index.ts';

const KEY = 'status-effects/data';
const DATA_VERSION = 1;

export interface SavedNight {
  id: string;
  events: LogEvent[];
  /** When the user tapped End night, if they did. */
  endedAt: number | null;
}

export interface AppData {
  version: number;
  profile: Profile;
  tonight: SavedNight;
  /** Finished nights, oldest first. History will be built from these. */
  past: SavedNight[];
}

/** Until onboarding exists in the app, this is everyone's starting character. */
export const DEFAULT_PROFILE: Profile = {
  weightKg: 80, heightCm: 178, age: 32, sex: 'm', region: 'ca', bedtime: '23:30', wakeTime: '07:30',
};

export function newNight(): SavedNight {
  return { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, events: [], endedAt: null };
}

export function defaultData(): AppData {
  return { version: DATA_VERSION, profile: DEFAULT_PROFILE, tonight: newNight(), past: [] };
}

function isNight(x: unknown): x is SavedNight {
  const n = x as SavedNight;
  return !!n && typeof n.id === 'string' && Array.isArray(n.events);
}

/** Bring older saved formats up to date. (Only version 1 exists so far.) */
function upgrade(raw: any): AppData | null {
  if (!raw || typeof raw !== 'object' || raw.version !== DATA_VERSION) return null;
  if (!isNight(raw.tonight) || !Array.isArray(raw.past)) return null;
  return {
    version: DATA_VERSION,
    profile: { ...DEFAULT_PROFILE, ...(raw.profile ?? {}) },
    tonight: { ...raw.tonight, endedAt: raw.tonight.endedAt ?? null },
    past: raw.past.filter(isNight),
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
