export type AffirmationCollection = {
  id: string;
  title: string;
  emoji: string;
  coverColor: string;   // hex — used as card tint, adapts to theme
  category: string;     // 'morning' | 'selfworth' | 'calm' | etc.
  isCustom: boolean;
  sortIdx: number;
  createdAt: number;
  // Computed at list time:
  count?: number;
  sessionCount?: number;
};

export type Affirmation = {
  id: string;
  collectionId: string;
  body: string;
  sortIdx: number;
  createdAt: number;
  saved?: boolean;
};

export type AffirmationSession = {
  id: string;
  collectionId: string;
  playedAt: number;
};

// ─── Section groupings for the browse screen ─────────────────────────────────
export type CollectionSection = {
  key: string;
  title: string;
  collections: AffirmationCollection[];
};
