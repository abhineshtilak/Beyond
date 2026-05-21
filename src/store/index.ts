import { create } from 'zustand';

type AppState = {
  dbReady: boolean;
  setDbReady: (v: boolean) => void;
  refreshKey: number;
  bumpRefresh: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  dbReady: false,
  setDbReady: (v) => set({ dbReady: v }),
  refreshKey: 0,
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
