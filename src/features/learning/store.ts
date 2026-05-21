import { create } from 'zustand';
import * as repo from './repo';
import type { LearningTopic, LearningInput } from './types';

type State = {
  items: LearningTopic[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: LearningInput) => Promise<string>;
  update: (id: string, patch: Partial<LearningInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const useLearningStore = create<State>((set, get) => ({
  items: [],
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      set({ items: await repo.list() });
    } finally {
      set({ loading: false });
    }
  },
  create: async (input) => {
    const t = await repo.create(input);
    await get().refresh();
    return t.id;
  },
  update: async (id, patch) => { await repo.update(id, patch); await get().refresh(); },
  remove: async (id) => { await repo.remove(id); await get().refresh(); },
}));
