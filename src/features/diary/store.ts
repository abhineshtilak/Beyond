import { create } from 'zustand';
import { ymd } from '@/lib/date';
import * as repo from './repo';
import type { DiaryEntry, Mood } from './types';

type State = {
  today: DiaryEntry | null;
  loading: boolean;
  loadToday: () => Promise<void>;
  setMood: (mood: Mood | null) => Promise<void>;
  patch: (patch: Partial<Omit<DiaryEntry, 'id' | 'entryDate' | 'createdAt'>>) => Promise<void>;
};

export const useDiaryStore = create<State>((set, get) => ({
  today: null,
  loading: false,
  loadToday: async () => {
    set({ loading: true });
    try {
      const entry = await repo.getEntry(ymd());
      set({ today: entry });
    } finally {
      set({ loading: false });
    }
  },
  setMood: async (mood) => {
    const updated = await repo.upsertEntry(ymd(), { mood });
    set({ today: updated });
  },
  patch: async (patch) => {
    const updated = await repo.upsertEntry(ymd(), patch);
    set({ today: updated });
  },
}));
