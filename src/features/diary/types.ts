export type Mood = 'great' | 'good' | 'ok' | 'low' | 'bad';

export type DiaryEntry = {
  id: string;
  entryDate: string;
  summary: string | null;
  good: string | null;
  bad: string | null;
  learned: string | null;
  progress: string | null;
  happy: string | null;
  mood: Mood | null;
  createdAt: number;
};

export type DiaryInput = Omit<DiaryEntry, 'id' | 'createdAt'>;

// Vivid accent hues — used directly as dots/badges/indicators.
// These intentionally stay the same across all themes (saturated mid-tones
// read clearly on light, mid, and dark backgrounds alike).
export const MOOD_META: Record<Mood, { label: string; tint: string }> = {
  great: { label: 'Great', tint: '#A8B89F' },   // sage
  good:  { label: 'Good',  tint: '#9EB7C9' },   // sky
  ok:    { label: 'Okay',  tint: '#E8D095' },   // butter
  low:   { label: 'Low',   tint: '#E8B4A0' },   // peach
  bad:   { label: 'Tough', tint: '#D8A4A4' },   // rose
};
