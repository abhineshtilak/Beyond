import { create } from 'zustand';
import { ymd } from '@/lib/date';
import * as repo from './repo';
import type { HabitInput, HabitWithStats } from './types';

type State = {
  habits: HabitWithStats[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: HabitInput) => Promise<void>;
  update: (id: string, input: HabitInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggleToday: (id: string) => Promise<void>;
};

export const useHabitsStore = create<State>((set, get) => ({
  habits: [],
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const habits = await repo.listWithStats();
      set({ habits });
    } finally {
      set({ loading: false });
    }
  },
  create: async (input) => {
    await repo.createHabit(input);
    await get().refresh();
  },
  update: async (id, input) => {
    await repo.updateHabit(id, input);
    await get().refresh();
  },
  remove: async (id) => {
    await repo.deleteHabit(id);
    await get().refresh();
  },
  toggleToday: async (id) => {
    const today = ymd();
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return;
    const nowDone = await repo.toggleCheckIn(id, today);
    const nextDates = new Set(habit.doneDates);
    if (nowDone) nextDates.add(today);
    else nextDates.delete(today);
    set({
      habits: get().habits.map((h) =>
        h.id === id
          ? {
              ...h,
              doneToday: nowDone,
              doneDates: nextDates,
              streak: repo.computeStreak(nextDates),
              successRate: repo.computeSuccessRate(nextDates, h.targetDays),
            }
          : h,
      ),
    });
  },
}));
