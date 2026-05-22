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
  1: { label: 'Low',    tint: '#DCE5EA' },   // skySoft
  2: { label: 'Medium', tint: '#EEE4C8' },   // butterSoft
  3: { label: 'High',   tint: '#EBDADA' },   // roseSoft
};

export const CATEGORY_META: Record<TaskCategory, { label: string; tint: string }> = {
  work:     { label: 'Work',     tint: '#DCE5EA' },   // skySoft
  personal: { label: 'Personal', tint: '#F1DDD4' },   // peachSoft
  health:   { label: 'Health',   tint: '#E3E8DE' },   // sageSoft
  learning: { label: 'Learning', tint: '#E7E0EC' },   // lavenderSoft
  finance:  { label: 'Finance',  tint: '#EEE4C8' },   // butterSoft
  other:    { label: 'Other',    tint: '#EBDADA' },   // roseSoft
};
