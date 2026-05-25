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
  goalId: string | null;   // kept for backward compat (primary goal)
  goalIds: string[];        // all linked goals (from junction table)
  reminderTime: string | null;
  notificationId: string | null;
  createdAt: number;
  completedAt: number | null;
  durationMins: number;   // minutes this task typically takes (0 = no auto-log)
};

export type TaskInput = {
  title: string;
  notes?: string | null;
  category?: TaskCategory | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  goalIds?: string[];        // replaces goalId for multi-goal support
  goalId?: string | null;    // kept for backward compat; ignored if goalIds is provided
  reminderTime?: string | null;
  durationMins?: number;
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
