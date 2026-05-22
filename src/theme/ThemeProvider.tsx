import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { getDB } from '@/lib/db';
import { lightPalette, darkPalette, midPalette, type Palette } from './palettes';

export type ThemeMode = 'light' | 'dark' | 'mid' | 'system';

type ThemeCtx = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => Promise<void>;
  resolved: 'light' | 'dark' | 'mid';
  colors: Palette;
};

const Ctx = createContext<ThemeCtx | null>(null);

async function loadStored(): Promise<ThemeMode> {
  try {
    const db = await getDB();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'themeMode'`,
    );
    const v = row?.value as ThemeMode | undefined;
    if (v === 'light' || v === 'dark' || v === 'mid' || v === 'system') return v;
  } catch {}
  return 'system';
}

async function saveStored(mode: ThemeMode) {
  try {
    const db = await getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('themeMode', ?)`,
      [mode],
    );
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    loadStored().then(setModeState);
  }, []);

  const setMode = useCallback(async (m: ThemeMode) => {
    setModeState(m);
    await saveStored(m);
  }, []);

  const resolved: 'light' | 'dark' | 'mid' = useMemo(() => {
    if (mode === 'mid') return 'mid';
    if (mode === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    return mode;
  }, [mode, systemScheme]);

  const colors: Palette =
    resolved === 'dark' ? darkPalette : resolved === 'mid' ? midPalette : lightPalette;

  const value = useMemo<ThemeCtx>(
    () => ({ mode, setMode, resolved, colors }),
    [mode, setMode, resolved, colors],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      mode: 'system',
      setMode: async () => {},
      resolved: 'light',
      colors: lightPalette,
    };
  }
  return ctx;
}

export function useColors(): Palette {
  return useTheme().colors;
}
