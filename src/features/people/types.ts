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
  // Deep relationship fields
  nextTopics: string | null;
  promises: string | null;
  relationshipScore: number | null;   // 1–5
  howWeMet: string | null;
  sharedMemories: string | null;
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
  nextTopics?: string | null;
  promises?: string | null;
  relationshipScore?: number | null;
  howWeMet?: string | null;
  sharedMemories?: string | null;
};

export type InteractionMood = 'great' | 'good' | 'ok' | 'distant' | 'conflict';
export type InteractionMedium = 'met_in_person' | 'call' | 'text' | 'online';

export type PersonInteraction = {
  id: string;
  personId: string;
  logDate: string;
  notes: string | null;
  mood: InteractionMood | null;
  medium: InteractionMedium | null;
  durationMins: number | null;
  createdAt: number;
};

export type InteractionInput = {
  notes?: string | null;
  mood?: InteractionMood | null;
  medium?: InteractionMedium | null;
  durationMins?: number | null;
};

export const MOOD_META: Record<InteractionMood, { label: string; emoji: string; color: string }> = {
  great:    { label: 'Great',    emoji: '😄', color: '#7FA682' },
  good:     { label: 'Good',     emoji: '🙂', color: '#A8B89F' },
  ok:       { label: 'Okay',     emoji: '😐', color: '#C4B89A' },
  distant:  { label: 'Distant',  emoji: '😶', color: '#B0A8B9' },
  conflict: { label: 'Conflict', emoji: '😔', color: '#B97A6B' },
};

export const MEDIUM_META: Record<InteractionMedium, { label: string; emoji: string }> = {
  met_in_person: { label: 'In person', emoji: '🤝' },
  call:          { label: 'Call',       emoji: '📞' },
  text:          { label: 'Text',       emoji: '💬' },
  online:        { label: 'Online',     emoji: '💻' },
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
