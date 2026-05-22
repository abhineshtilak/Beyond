import type { Attachment } from '@/components/MediaAttachments';

export type RealizationKind = 'realization' | 'lesson' | 'mistake' | 'quote' | 'observation';

export type Realization = {
  id: string;
  title: string | null;
  content: string;        // plain-text fallback / for search
  bodyHtml: string | null; // rich HTML
  attachments: Attachment[];
  kind: RealizationKind;
  createdAt: number;
};

export type RealizationInput = {
  title?: string | null;
  content: string;
  bodyHtml?: string | null;
  attachments?: Attachment[];
  kind: RealizationKind;
};

export const REALIZATION_META: Record<RealizationKind, { label: string; tint: string; description: string }> = {
  realization: { label: 'Realization', tint: '#E3E8DE', description: 'Something you suddenly saw clearly.' },   // sageSoft
  lesson:      { label: 'Lesson',      tint: '#DCE5EA', description: 'Knowledge earned from doing.' },          // skySoft
  mistake:     { label: 'Mistake',     tint: '#F1DDD4', description: 'A misstep worth remembering.' },          // peachSoft
  quote:       { label: 'Quote',       tint: '#E7E0EC', description: 'Words from someone — or yourself.' },     // lavenderSoft
  observation: { label: 'Observation', tint: '#EEE4C8', description: 'Something you noticed about life.' },     // butterSoft
};

export const REALIZATION_KINDS: RealizationKind[] = ['realization', 'lesson', 'mistake', 'quote', 'observation'];

export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}
