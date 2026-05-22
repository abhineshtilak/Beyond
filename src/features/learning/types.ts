export type LearningStatus = 'active' | 'paused' | 'completed';
export type ResourceKind = 'book' | 'video' | 'article' | 'course' | 'podcast' | 'other';

export type Resource = {
  id: string;
  kind: ResourceKind;
  title: string;
  url?: string | null;
  done?: boolean;
};

export type LearningTopic = {
  id: string;
  title: string;
  category: string | null;
  progress: number;
  notes: string | null;
  resources: Resource[];
  targetDate: string | null;
  status: LearningStatus;
  goalId: string | null;
  reminderTime: string | null;
  reminderDays: string | null;
  notificationIds: string | null;
  createdAt: number;
};

export function parseLearningReminderDays(csv: string | null): number[] {
  if (!csv) return [];
  return csv.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
}

export type LearningInput = {
  title: string;
  category?: string | null;
  progress?: number;
  notes?: string | null;
  resources?: Resource[];
  targetDate?: string | null;
  status?: LearningStatus;
  goalId?: string | null;
  reminderTime?: string | null;
  reminderDays?: number[] | null;
};

export const RESOURCE_META: Record<ResourceKind, { label: string; tint: string }> = {
  book:    { label: 'Book',    tint: '#EEE4C8' },   // butterSoft
  video:   { label: 'Video',   tint: '#EBDADA' },   // roseSoft
  article: { label: 'Article', tint: '#DCE5EA' },   // skySoft
  course:  { label: 'Course',  tint: '#E7E0EC' },   // lavenderSoft
  podcast: { label: 'Podcast', tint: '#E3E8DE' },   // sageSoft
  other:   { label: 'Other',   tint: '#F1DDD4' },   // peachSoft
};
