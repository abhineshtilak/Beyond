export type TaskStatus = 'pending' | 'completed' | 'postponed' | 'missed';
export type TaskPriority = 1 | 2 | 3;

export type TaskCategory = 'work' | 'personal' | 'health' | 'learning' | 'finance' | 'other';

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  category: TaskCategory | null;
  priority: TaskPriority;
  dueDate: string | null;
  status: TaskStatus;
  goalId: string | null;
  reminderTime: string | null;
  notificationId: string | null;
  createdAt: number;
  completedAt: number | null;
};

export type TaskInput = {
  title: string;
  notes?: string | null;
  category?: TaskCategory | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  goalId?: string | null;
  reminderTime?: string | null;
};

export const PRIORITY_META: Record<TaskPriority, { label: string; tint: string }> = {
  1: { label: 'Low', tint: '#DEE8EF' },
  2: { label: 'Medium', tint: '#F4ECD3' },
  3: { label: 'High', tint: '#F0DEDE' },
};

export const CATEGORY_META: Record<TaskCategory, { label: string; tint: string }> = {
  work: { label: 'Work', tint: '#DEE8EF' },
  personal: { label: 'Personal', tint: '#F7E3D9' },
  health: { label: 'Health', tint: '#E4EADF' },
  learning: { label: 'Learning', tint: '#EBE3F0' },
  finance: { label: 'Finance', tint: '#F4ECD3' },
  other: { label: 'Other', tint: '#F0DEDE' },
};
