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
  health: { label: 'Health', tint: '#E4EADF' },
  career: { label: 'Career', tint: '#DEE8EF' },
  learning: { label: 'Learning', tint: '#EBE3F0' },
  finance: { label: 'Finance', tint: '#F4ECD3' },
  relationships: { label: 'Relationships', tint: '#F7E3D9' },
  creative: { label: 'Creative', tint: '#F0DEDE' },
  spiritual: { label: 'Spiritual', tint: '#EBE3F0' },
  travel: { label: 'Travel', tint: '#DEE8EF' },
  other: { label: 'Other', tint: '#F5F0E6' },
};

export const GOAL_PRIORITY_META: Record<GoalPriority, { label: string; tint: string }> = {
  1: { label: 'Someday', tint: '#DEE8EF' },
  2: { label: 'Soon', tint: '#F4ECD3' },
  3: { label: 'Now', tint: '#F0DEDE' },
};

export const GOAL_STATUS_META: Record<GoalStatus, { label: string; tint: string }> = {
  active: { label: 'Active', tint: '#E4EADF' },
  paused: { label: 'Paused', tint: '#F5F0E6' },
  completed: { label: 'Completed', tint: '#DEE8EF' },
  abandoned: { label: 'Let go', tint: '#F0DEDE' },
};
