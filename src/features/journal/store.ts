import { create } from 'zustand';
import * as repo from './repo';
import type { JournalEntry, JournalInput } from './types';

type State = {
  entries: JournalEntry[];
  streak: number;
  todayCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: JournalInput) => Promise<string>;
  update: (id: string, patch: JournalInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeMany: (ids: string[]) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
};

export const useJournalStore = create<State>((set, get) => ({
  entries: [],
  streak: 0,
  todayCount: 0,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const [entries, streak, todayCount] = await Promise.all([
        repo.list(),
        repo.streak(),
        repo.todayCount(),
      ]);
      set({ entries, streak, todayCount });
    } finally {
      set({ loading: false });
    }
  },
  create: async (input) => {
    const e = await repo.create(input);
    await get().refresh();
    return e.id;
  },
  update: async (id, patch) => { await repo.update(id, patch); await get().refresh(); },
  remove: async (id) => { await repo.remove(id); await get().refresh(); },
  removeMany: async (ids) => { await repo.removeMany(ids); await get().refresh(); },
  toggleStar: async (id) => { await repo.toggleStar(id); await get().refresh(); },
}));
