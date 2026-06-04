import { create } from 'zustand';
import * as repo from './repo';
import type { AffirmationCollection, Affirmation } from './types';

type AffirmationsState = {
  collections: AffirmationCollection[];
  savedAffirmations: Affirmation[];
  loading: boolean;
  refresh: () => Promise<void>;
  refreshSaved: () => Promise<void>;
};

export const useAffirmationsStore = create<AffirmationsState>((set) => ({
  collections: [],
  savedAffirmations: [],
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const collections = await repo.listCollections();
      set({ collections });
    } finally {
      set({ loading: false });
    }
  },

  refreshSaved: async () => {
    const savedAffirmations = await repo.listSavedAffirmations();
    set({ savedAffirmations });
  },
}));
