export type Relation = 'family' | 'partner' | 'friend' | 'mentor' | 'colleague' | 'other';

export type Person = {
  id: string;
  name: string;
  relation: Relation | null;
  photoUri: string | null;
  notes: string | null;
  theirGoals: string | null;
  theirStruggles: string | null;
  mySupport: string | null;
  contributions: string | null;
  futurePlans: string | null;
  lastContactDate: string | null;
  contactReminderDays: number | null;
  notificationId: string | null;
  birthday: string | null;
  anniversary: string | null;
  createdAt: number;
};

export type PersonInput = {
  name: string;
  relation?: Relation | null;
  photoUri?: string | null;
  notes?: string | null;
  theirGoals?: string | null;
  theirStruggles?: string | null;
  mySupport?: string | null;
  contributions?: string | null;
  futurePlans?: string | null;
  lastContactDate?: string | null;
  contactReminderDays?: number | null;
  birthday?: string | null;
  anniversary?: string | null;
};

export const RELATION_META: Record<Relation, { label: string; tint: string }> = {
  family: { label: 'Family', tint: '#F7E3D9' },
  partner: { label: 'Partner', tint: '#F0DEDE' },
  friend: { label: 'Friend', tint: '#E4EADF' },
  mentor: { label: 'Mentor', tint: '#EBE3F0' },
  colleague: { label: 'Colleague', tint: '#DEE8EF' },
  other: { label: 'Other', tint: '#F5F0E6' },
};

export const RELATIONS: Relation[] = ['family', 'partner', 'friend', 'mentor', 'colleague', 'other'];
