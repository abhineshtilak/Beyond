import { create } from 'zustand';
import * as repo from './repo';
import type { Person, PersonInput } from './types';

type State = {
  items: Person[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: PersonInput) => Promise<string>;
  update: (id: string, patch: Partial<PersonInput>) => Promise<void>;
  markContacted: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const usePeopleStore = create<State>((set, get) => ({
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
    const p = await repo.create(input);
    await get().refresh();
    return p.id;
  },
  update: async (id, patch) => { await repo.update(id, patch); await get().refresh(); },
  markContacted: async (id) => { await repo.markContacted(id); await get().refresh(); },
  remove: async (id) => { await repo.remove(id); await get().refresh(); },
}));
