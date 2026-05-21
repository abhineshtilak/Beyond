import { create } from 'zustand';
import * as repo from './repo';

type State = {
  profile: repo.Profile;
  loaded: boolean;
  refresh: () => Promise<void>;
  update: (patch: Partial<repo.Profile>) => Promise<void>;
};

export const useProfileStore = create<State>((set, get) => ({
  profile: { name: null, pronouns: null, birthday: null, photoUri: null },
  loaded: false,
  refresh: async () => {
    const p = await repo.get();
    set({ profile: p, loaded: true });
  },
  update: async (patch) => {
    await repo.upsert(patch);
    await get().refresh();
  },
}));
