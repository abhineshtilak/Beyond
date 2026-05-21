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

export const MOOD_META: Record<Mood, { label: string; tint: string }> = {
  great: { label: 'Great', tint: '#A8B89F' },
  good: { label: 'Good', tint: '#9EB7C9' },
  ok: { label: 'Okay', tint: '#E8D095' },
  low: { label: 'Low', tint: '#E8B4A0' },
  bad: { label: 'Tough', tint: '#D8A4A4' },
};
