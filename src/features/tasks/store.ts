import { create } from 'zustand';
import { ymd } from '@/lib/date';
import * as repo from './repo';
import type { Task, TaskInput, TaskStatus } from './types';

export type TaskFilter = 'today' | 'upcoming' | 'all' | 'completed';

type State = {
  tasks: Task[];
  loading: boolean;
  filter: TaskFilter;
  setFilter: (f: TaskFilter) => void;
  refresh: () => Promise<void>;
  create: (input: TaskInput) => Promise<void>;
  update: (id: string, input: TaskInput) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  postpone: (id: string, toDate: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeMany: (ids: string[]) => Promise<void>;
  completeMany: (ids: string[]) => Promise<void>;
};

export const useTasksStore = create<State>((set, get) => ({
  tasks: [],
  loading: false,
  filter: 'today',
  setFilter: (f) => set({ filter: f }),
  refresh: async () => {
    set({ loading: true });
    try {
      const tasks = await repo.listTasks();
      set({ tasks });
    } finally {
      set({ loading: false });
    }
  },
  create: async (input) => {
    await repo.createTask(input);
    await get().refresh();
  },
  update: async (id, input) => {
    await repo.updateTask(id, input);
    await get().refresh();
  },
  toggleComplete: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const next: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    await repo.setStatus(id, next);
    set({
      tasks: get().tasks.map((t) =>
        t.id === id ? { ...t, status: next, completedAt: next === 'completed' ? Date.now() : null } : t,
      ),
    });
  },
  postpone: async (id, toDate) => {
    await repo.postponeTask(id, toDate);
    await get().refresh();
  },
  remove: async (id) => {
    await repo.deleteTask(id);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },
  removeMany: async (ids) => {
    for (const id of ids) {
      await repo.deleteTask(id);
    }
    await get().refresh();
  },
  completeMany: async (ids) => {
    for (const id of ids) {
      await repo.setStatus(id, 'completed');
    }
    await get().refresh();
  },
}));

export function selectFiltered(tasks: Task[], filter: TaskFilter): Task[] {
  const today = ymd();
  if (filter === 'today') {
    return tasks.filter((t) => t.status !== 'completed' && (t.dueDate === today || t.dueDate === null || (t.status === 'missed') || (t.dueDate !== null && t.dueDate < today)));
  }
  if (filter === 'upcoming') {
    return tasks.filter((t) => t.status === 'pending' && t.dueDate !== null && t.dueDate > today);
  }
  if (filter === 'completed') {
    return tasks.filter((t) => t.status === 'completed');
  }
  return tasks;
}
