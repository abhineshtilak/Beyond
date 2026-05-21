import type { Attachment } from '@/components/MediaAttachments';

export type Mood = 'great' | 'good' | 'ok' | 'low' | 'bad';

export type JournalEntry = {
  id: string;
  entryDate: string;          // YYYY-MM-DD (local day, grouping key)
  createdAt: number;          // Date.now()
  updatedAt: number;
  bodyHtml: string | null;    // rich content
  content: string;            // plain text (search/preview)
  attachments: Attachment[];
  promptKey: string | null;   // which prompt was used (if any)
  mood: Mood | null;
  starred: boolean;
};

export type JournalInput = {
  bodyHtml?: string | null;
  content?: string;
  attachments?: Attachment[];
  promptKey?: string | null;
  mood?: Mood | null;
};

export type Prompt = {
  key: string;
  label: string;
  question: string;
  description: string;
};

export const PROMPTS: Prompt[] = [
  { key: 'free',       label: 'Free write',           question: '',                                                       description: 'A blank page. Whatever you want.' },
  { key: 'day',        label: 'How was your day',     question: 'How was your day?',                                       description: 'In your own words. No rules.' },
  { key: 'gratitude',  label: 'Three things',         question: 'Three things you\'re grateful for, however small.',       description: 'The gentlest habit there is.' },
  { key: 'win',        label: 'Win of the day',       question: 'What did you do today that you\'re proud of?',            description: 'Something to acknowledge yourself for.' },
  { key: 'lesson',     label: 'What I learned',       question: 'What did today teach you?',                               description: 'A skill, a person, an idea — anything.' },
  { key: 'mistake',    label: 'A misstep',            question: 'What\'s one thing you would do differently?',             description: 'Honest, not harsh.' },
  { key: 'release',    label: 'Let it out',           question: 'What\'s weighing on you? Name it. Hold nothing back.',    description: 'For anxiety, anger, sadness. Just write.' },
  { key: 'tomorrow',   label: 'Set tomorrow',         question: 'What does tomorrow ask of you?',                          description: 'Three intentions, or just one.' },
  { key: 'future',     label: 'Letter to future me',  question: 'Future me — here\'s what I want you to remember.',        description: 'Speak across time.' },
  { key: 'past',       label: 'Letter to past me',    question: 'Past me — here\'s what I know now that you didn\'t.',     description: 'Compassion across time.' },
  { key: 'identity',   label: 'Who am I becoming',    question: 'Describe the person you are becoming.',                   description: 'Identity precedes habit.' },
  { key: 'fear',       label: 'Name the fear',        question: 'What scares you about this? Get specific.',               description: '"Name it and tame it."' },
  { key: 'win-week',   label: 'Week wins',            question: 'What were this week\'s wins, even the small ones?',       description: 'A Sunday-night ritual.' },
];

export function findPrompt(key: string | null): Prompt | null {
  if (!key) return null;
  return PROMPTS.find((p) => p.key === key) ?? null;
}

export const MOOD_OPTIONS: { key: Mood; label: string; tint: string }[] = [
  { key: 'great', label: 'Great', tint: '#A8B89F' },
  { key: 'good',  label: 'Good',  tint: '#9EB7C9' },
  { key: 'ok',    label: 'Okay',  tint: '#E8D095' },
  { key: 'low',   label: 'Low',   tint: '#E8B4A0' },
  { key: 'bad',   label: 'Tough', tint: '#D8A4A4' },
];
