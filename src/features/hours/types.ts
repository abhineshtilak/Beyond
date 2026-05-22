export type HourCategory =
  | 'work' | 'learning' | 'health' | 'family' | 'social'
  | 'rest' | 'creative' | 'personal' | 'commute' | 'idle';

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
  work:      { label: 'Work',     tint: '#9EB7C9' },
  learning:  { label: 'Learning', tint: '#B8A8C9' },
  health:    { label: 'Health',   tint: '#A8B89F' },
  family:    { label: 'Family',   tint: '#E8B4A0' },
  social:    { label: 'Social',   tint: '#E8D095' },
  rest:      { label: 'Rest',     tint: '#C9C2B7' },
  creative:  { label: 'Creative', tint: '#D8A4A4' },
  personal:  { label: 'Personal', tint: '#EFE7DC' },   // surfaceAlt
  commute:   { label: 'Commute',  tint: '#DCE5EA' },   // skySoft
  idle:      { label: 'Wasted',   tint: '#ECC4BB' },
};

export const HOUR_CATEGORIES: HourCategory[] = [
  'work', 'learning', 'health', 'family', 'social',
  'rest', 'creative', 'personal', 'commute', 'idle',
];

export function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}
