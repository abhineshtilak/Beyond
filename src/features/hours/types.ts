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

// Tints are medium-saturation colors that read clearly on both dark and light
// backgrounds — used as block-strip fills, legend dots, and chip accents.
export const HOUR_CATEGORY_META: Record<HourCategory, { label: string; tint: string }> = {
  work:      { label: 'Work',     tint: '#6A9FB5' },
  learning:  { label: 'Learning', tint: '#9B87C0' },
  health:    { label: 'Health',   tint: '#6FA882' },
  personal:  { label: 'Personal', tint: '#C4A882' },
  finance:   { label: 'Finance',  tint: '#B8A44C' },
  other:     { label: 'Other',    tint: '#9A9A9A' },
  social:    { label: 'Social',   tint: '#D4956A' },
  rest:      { label: 'Rest',     tint: '#7EB5C5' },
  creative:  { label: 'Creative', tint: '#C47A7A' },
  // Legacy — kept for existing rows
  family:    { label: 'Family',   tint: '#C48A72' },
  commute:   { label: 'Commute',  tint: '#8FA8B8' },
  idle:      { label: 'Wasted',   tint: '#B07070' },
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
