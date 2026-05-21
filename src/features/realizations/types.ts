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
  realization: { label: 'Realization', tint: '#E4EADF', description: 'Something you suddenly saw clearly.' },
  lesson: { label: 'Lesson', tint: '#DEE8EF', description: 'Knowledge earned from doing.' },
  mistake: { label: 'Mistake', tint: '#F7E3D9', description: 'A misstep worth remembering.' },
  quote: { label: 'Quote', tint: '#EBE3F0', description: 'Words from someone — or yourself.' },
  observation: { label: 'Observation', tint: '#F4ECD3', description: 'Something you noticed about life.' },
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
