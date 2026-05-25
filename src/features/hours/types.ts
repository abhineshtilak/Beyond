export type HourCategory =
  | 'work' | 'learning' | 'health' | 'personal' | 'finance'
  | 'social' | 'rest' | 'creative' | 'other'
  // legacy ids kept for backward-compat with existing rows
  | 'family' | 'commute' | 'idle';

export type HourLog = {
  id: string;
  logDate: string;     // YYYY-MM-DD
  hour: number;        // 0-23
  activity: string;
  category: HourCategory | null;
};

export type HourInput = {
  logDate: string;
  hour: number;
  activity: string;
  category: HourCategory | null;
};

export const HOUR_CATEGORY_META: Record<HourCategory, { label: string; tint: string }> = {
  // Core — aligned with task & habit categories
  work:      { label: 'Work',     tint: '#9EB7C9' },
  learning:  { label: 'Learning', tint: '#B8A8C9' },
  health:    { label: 'Health',   tint: '#A8B89F' },
  personal:  { label: 'Personal', tint: '#EFE7DC' },
  finance:   { label: 'Finance',  tint: '#EEE4C8' },
  other:     { label: 'Other',    tint: '#EBDADA' },
  // Extra hour-specific
  social:    { label: 'Social',   tint: '#E8D095' },
  rest:      { label: 'Rest',     tint: '#C9C2B7' },
  creative:  { label: 'Creative', tint: '#D8A4A4' },
  // Legacy — kept for existing rows
  family:    { label: 'Family',   tint: '#E8B4A0' },
  commute:   { label: 'Commute',  tint: '#DCE5EA' },
  idle:      { label: 'Wasted',   tint: '#ECC4BB' },
};

export const HOUR_CATEGORIES: HourCategory[] = [
  'work', 'learning', 'health', 'personal', 'finance',
  'social', 'rest', 'creative', 'other',
];

export function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

// Sub-hour time block
export type TimeBlock = {
  id: string;
  logDate: string;
  startHour: number;
  startMinute: number;
  durationMins: number;
  activity: string;
  category: string | null;
};

export type TimeBlockInput = {
  logDate: string;
  startHour: number;
  startMinute: number;
  durationMins: number;
  activity: string;
  category: string | null;
};

// User-manageable category
export type HourCategoryRow = {
  id: string;
  label: string;
  color: string;
  sortIdx: number;
};
