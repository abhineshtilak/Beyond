import type { Attachment } from '@/components/MediaAttachments';

export type Dream = {
  id: string;
  title: string;
  description: string | null;
  why: string | null;
  imageUri: string | null;
  attachments: Attachment[];
  createdAt: number;
};

export type DreamInput = {
  title: string;
  description?: string | null;
  why?: string | null;
  imageUri?: string | null;
  attachments?: Attachment[];
};
