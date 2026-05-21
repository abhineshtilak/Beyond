import { create } from 'zustand';
import * as repo from './repo';
import type { FuturePlan, FuturePlanInput } from './types';

type State = {
  items: FuturePlan[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: FuturePlanInput) => Promise<void>;
  update: (id: string, patch: Partial<FuturePlanInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const useFutureStore = create<State>((set, get) => ({
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
  create: async (input) => { await repo.create(input); await get().refresh(); },
  update: async (id, patch) => { await repo.update(id, patch); await get().refresh(); },
  remove: async (id) => { await repo.remove(id); await get().refresh(); },
}));
