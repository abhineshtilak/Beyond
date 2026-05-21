import { create } from 'zustand';
import * as repo from './repo';
import type { Realization, RealizationInput, RealizationKind } from './types';

type State = {
  items: Realization[];
  loading: boolean;
  query: string;
  kind: RealizationKind | null;
  setQuery: (q: string) => void;
  setKind: (k: RealizationKind | null) => void;
  refresh: () => Promise<void>;
  create: (input: RealizationInput) => Promise<string>;
  update: (id: string, input: RealizationInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeMany: (ids: string[]) => Promise<void>;
};

export const useRealizationsStore = create<State>((set, get) => ({
  items: [],
  loading: false,
  query: '',
  kind: null,
  setQuery: (q) => { set({ query: q }); get().refresh(); },
  setKind: (k) => { set({ kind: k }); get().refresh(); },
  refresh: async () => {
    set({ loading: true });
    try {
      const { query, kind } = get();
      const items = query || kind ? await repo.search(query, kind) : await repo.list();
      set({ items });
    } finally {
      set({ loading: false });
    }
  },
  create: async (input) => { const r = await repo.create(input); await get().refresh(); return r.id; },
  update: async (id, input) => { await repo.update(id, input); await get().refresh(); },
  remove: async (id) => { await repo.remove(id); await get().refresh(); },
  removeMany: async (ids) => { await repo.removeMany(ids); await get().refresh(); },
}));
