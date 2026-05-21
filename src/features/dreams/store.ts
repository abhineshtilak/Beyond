import { create } from 'zustand';
import * as repo from './repo';
import type { Dream, DreamInput } from './types';

type State = {
  items: Dream[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: DreamInput) => Promise<string>;
  get: (id: string) => Promise<import('./types').Dream | null>;
  update: (id: string, patch: Partial<DreamInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const useDreamsStore = create<State>((set, get) => ({
  items: [],
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const items = await repo.list();
      set({ items });
    } finally {
      set({ loading: false });
    }
  },
  create: async (input) => {
    const d = await repo.create(input);
    await get().refresh();
    return d.id;
  },
  get: async (id) => repo.get(id),
  update: async (id, patch) => { await repo.update(id, patch); await get().refresh(); },
  remove: async (id) => { await repo.remove(id); await get().refresh(); },
}));
