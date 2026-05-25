export type HabitCategory = 'health' | 'mind' | 'work' | 'learning' | 'personal';

export const HABIT_COLORS = ['#A8B89F', '#E8B4A0', '#B8A8C9', '#9EB7C9', '#E8D095', '#D8A4A4'];

export const HABIT_ICON_KEYS = [
  'sparkles', 'dumbbell', 'book-open', 'brain', 'glass-water',
  'moon', 'sun', 'heart', 'pen-line', 'leaf', 'apple', 'footprints',
  'music', 'coffee', 'code', 'mountain',
] as const;
export type HabitIconKey = typeof HABIT_ICON_KEYS[number];

export type Habit = {
  id: string;
  title: string;
  icon: HabitIconKey;
  color: string;
  category: HabitCategory | null;
  goalId: string | null;   // kept for backward compat (primary goal)
  goalIds: string[];        // all linked goals (from junction table)
  targetDays: number;
  reminderTime: string | null;  // "HH:mm"
  reminderDays: string | null;  // CSV of 0-6 (Sun-Sat)
  notificationIds: string | null; // JSON array
  createdAt: number;
  archived: boolean;
  streakCredits: number;
  streakRestoredDate: string | null;
  durationMins: number;   // minutes this habit typically takes (0 = no auto-log)
};

export type HabitInput = {
  title: string;
  icon: HabitIconKey;
  color: string;
  category?: HabitCategory | null;
  targetDays: number;
  goalIds?: string[];        // replaces goalId for multi-goal support
  goalId?: string | null;    // kept for backward compat; ignored if goalIds is provided
  reminderTime?: string | null;
  reminderDays?: number[] | null;
  durationMins?: number;
};

export type HabitWithStats = Habit & {
  doneToday: boolean;
  streak: number;
  doneDates: Set<string>;
  successRate: number;
  daysSinceStart: number;
};

export function parseReminderDays(csv: string | null): number[] {
  if (!csv) return [];
  return csv.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
}

export const TIMELINE_PRESETS: { label: string; days: number }[] = [
  { label: '21 days', days: 21 },
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
  { label: '180 days', days: 180 },
  { label: '1 year', days: 365 },
];
