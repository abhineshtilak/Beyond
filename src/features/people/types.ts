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
  family:    { label: 'Family',    tint: '#F1DDD4' },   // peachSoft
  partner:   { label: 'Partner',   tint: '#EBDADA' },   // roseSoft
  friend:    { label: 'Friend',    tint: '#E3E8DE' },   // sageSoft
  mentor:    { label: 'Mentor',    tint: '#E7E0EC' },   // lavenderSoft
  colleague: { label: 'Colleague', tint: '#DCE5EA' },   // skySoft
  other:     { label: 'Other',     tint: '#EFE7DC' },   // surfaceAlt
};

export const RELATIONS: Relation[] = ['family', 'partner', 'friend', 'mentor', 'colleague', 'other'];
