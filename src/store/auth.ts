import { create } from 'zustand';
import { getAuthMode, type AuthMode } from '@/lib/auth';

type AuthState = {
  mode: AuthMode;
  locked: boolean;
  authReady: boolean;

  // Call once after DB is ready to load the persisted mode
  initAuth: () => Promise<void>;

  // Called by lock screen after successful verification
  unlock: () => void;

  // Called when app returns from background to re-lock
  lock: () => void;

  // Called from settings after changing auth mode
  setMode: (m: AuthMode) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  mode: 'none',
  locked: false,
  authReady: false,

  initAuth: async () => {
    const mode = await getAuthMode();
    set({ mode, locked: mode !== 'none', authReady: true });
  },

  unlock: () => set({ locked: false }),

  lock: () => {
    if (get().mode !== 'none') set({ locked: true });
  },

  setMode: (m) => set({ mode: m }),
}));
