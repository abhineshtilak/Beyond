import { create } from 'zustand';
import { getDB } from './db';

const HAPTICS_KEY = 'hapticsEnabled';

type PreferencesState = {
  ready: boolean;
  hapticsEnabled: boolean;
  load: () => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
};

let hapticsEnabledCache = false;

async function readBool(key: string, fallback: boolean): Promise<boolean> {
  try {
    const db = await getDB();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = ?`,
      [key],
    );
    if (row?.value === 'true') return true;
    if (row?.value === 'false') return false;
  } catch {}
  return fallback;
}

async function writeBool(key: string, value: boolean) {
  try {
    const db = await getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [key, value ? 'true' : 'false'],
    );
  } catch {}
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  ready: false,
  hapticsEnabled: false,
  load: async () => {
    const hapticsEnabled = await readBool(HAPTICS_KEY, false);
    hapticsEnabledCache = hapticsEnabled;
    set({ hapticsEnabled, ready: true });
  },
  setHapticsEnabled: async (hapticsEnabled) => {
    hapticsEnabledCache = hapticsEnabled;
    set({ hapticsEnabled });
    await writeBool(HAPTICS_KEY, hapticsEnabled);
  },
}));

export function areHapticsEnabled() {
  return hapticsEnabledCache;
}
