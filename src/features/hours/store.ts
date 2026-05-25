import { create } from 'zustand';
import * as repo from './repo';
import type { HourLog } from './types';

type State = {
  date: string;
  logs: HourLog[];
  loading: boolean;
  setDate: (date: string) => void;
  refresh: () => Promise<void>;
  upsert: (hour: number, activity: string, category: string | null) => Promise<void>;
  clear: (hour: number) => Promise<void>;
};

export const useHoursStore = create<State>((set, get) => ({
  date: '',
  logs: [],
  loading: false,
  setDate: (date) => { set({ date, logs: [] }); get().refresh(); },
  refresh: async () => {
    const { date } = get();
    if (!date) return;
    set({ loading: true });
    try {
      const logs = await repo.listForDate(date);
      set({ logs });
    } finally {
      set({ loading: false });
    }
  },
  upsert: async (hour, activity, category) => {
    const { date } = get();
    if (!date) return;
    await repo.upsert(date, hour, activity, category);
    await get().refresh();
  },
  clear: async (hour) => {
    const { date } = get();
    if (!date) return;
    await repo.clear(date, hour);
    await get().refresh();
  },
}));
