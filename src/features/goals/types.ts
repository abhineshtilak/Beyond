export type GoalCategory =
  | 'health' | 'career' | 'learning' | 'finance'
  | 'relationships' | 'creative' | 'spiritual' | 'travel' | 'other';

export type GoalPriority = 1 | 2 | 3;
export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned';
export type InspirationKind = 'note' | 'quote' | 'image';

export type Goal = {
  id: string;
  title: string;
  category: GoalCategory | null;
  targetDate: string | null;
  priority: GoalPriority;
  why: string | null;
  feeling: string | null;
  currentPosition: string | null;
  problems: string | null;
  procedure: string | null;
  heroImageUri: string | null;
  progress: number;
  manualProgress: number | null;
  status: GoalStatus;
  createdAt: number;
};

export type GoalInput = {
  title: string;
  category?: GoalCategory | null;
  targetDate?: string | null;
  priority?: GoalPriority;
  why?: string | null;
  feeling?: string | null;
  currentPosition?: string | null;
  problems?: string | null;
  procedure?: string | null;
  heroImageUri?: string | null;
  manualProgress?: number | null;
  status?: GoalStatus;
};

export type Milestone = {
  id: string;
  goalId: string;
  title: string;
  done: boolean;
  orderIdx: number;
};

export type Inspiration = {
  id: string;
  goalId: string;
  kind: InspirationKind;
  content: string | null;
  imageUri: string | null;
  createdAt: number;
};

export type GoalWithStats = Goal & {
  milestonesTotal: number;
  milestonesDone: number;
  linkedTasksTotal: number;
  linkedTasksDone: number;
  linkedHabitsTotal: number;
  daysRemaining: number | null;
};

export const GOAL_CATEGORY_META: Record<GoalCategory, { label: string; tint: string }> = {
  health:        { label: 'Health',        tint: '#E3E8DE' },   // sageSoft
  career:        { label: 'Career',        tint: '#DCE5EA' },   // skySoft
  learning:      { label: 'Learning',      tint: '#E7E0EC' },   // lavenderSoft
  finance:       { label: 'Finance',       tint: '#EEE4C8' },   // butterSoft
  relationships: { label: 'Relationships', tint: '#F1DDD4' },   // peachSoft
  creative:      { label: 'Creative',      tint: '#EBDADA' },   // roseSoft
  spiritual:     { label: 'Spiritual',     tint: '#E7E0EC' },   // lavenderSoft
  travel:        { label: 'Travel',        tint: '#DCE5EA' },   // skySoft
  other:         { label: 'Other',         tint: '#EFE7DC' },   // surfaceAlt
};

export const GOAL_PRIORITY_META: Record<GoalPriority, { label: string; tint: string }> = {
  1: { label: 'Someday', tint: '#DCE5EA' },   // skySoft
  2: { label: 'Soon',    tint: '#EEE4C8' },   // butterSoft
  3: { label: 'Now',     tint: '#EBDADA' },   // roseSoft
};

export type GoalLog = {
  id: string;
  goalId: string;
  logDate: string;
  content: string;
  energy: 1 | 2 | 3 | 4;  // 1=struggling 2=okay 3=good 4=great
  createdAt: number;
};

export const GOAL_STATUS_META: Record<GoalStatus, { label: string; tint: string }> = {
  active:    { label: 'Active',    tint: '#E3E8DE' },   // sageSoft
  paused:    { label: 'Paused',    tint: '#EFE7DC' },   // surfaceAlt
  completed: { label: 'Completed', tint: '#DCE5EA' },   // skySoft
  abandoned: { label: 'Let go',    tint: '#EBDADA' },   // roseSoft
};
