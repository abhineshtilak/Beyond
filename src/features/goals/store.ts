import { create } from 'zustand';
import * as repo from './repo';
import type { GoalInput, GoalStatus, GoalWithStats } from './types';

type State = {
  goals: GoalWithStats[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: GoalInput) => Promise<string>;
  update: (id: string, patch: Partial<GoalInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setStatus: (id: string, status: GoalStatus) => Promise<void>;
};

export const useGoalsStore = create<State>((set, get) => ({
  goals: [],
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const goals = await repo.listWithStats();
      set({ goals });
    } finally {
      set({ loading: false });
    }
  },
  create: async (input) => {
    const g = await repo.createGoal(input);
    await get().refresh();
    return g.id;
  },
  update: async (id, patch) => {
    await repo.updateGoal(id, patch);
    await get().refresh();
  },
  remove: async (id) => {
    await repo.deleteGoal(id);
    await get().refresh();
  },
  setStatus: async (id, status) => {
    await repo.setStatus(id, status);
    await get().refresh();
  },
}));
