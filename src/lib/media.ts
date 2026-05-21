import * as FileSystem from 'expo-file-system/legacy';
import { uid } from '@/lib/db';

const MEDIA_DIR = `${FileSystem.documentDirectory}app-media/`;

export async function persistLocalMedia(uri: string, fallbackExt = 'bin'): Promise<string> {
  if (!uri || uri.startsWith(MEDIA_DIR)) return uri;

  await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
  const ext = extensionFromUri(uri) ?? fallbackExt;
  const dest = `${MEDIA_DIR}${uid()}.${ext.replace(/^\./, '')}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export async function persistPickedAsset(uri: string, mediaType?: string | null): Promise<string> {
  return persistLocalMedia(uri, fallbackExtForMediaType(mediaType));
}

function extensionFromUri(uri: string): string | null {
  const clean = uri.split('?')[0];
  const last = clean.split('/').pop();
  const match = last?.match(/\.([a-zA-Z0-9]{2,5})$/);
  return match?.[1] ?? null;
}

function fallbackExtForMediaType(mediaType?: string | null): string {
  if (mediaType === 'video') return 'mp4';
  if (mediaType === 'audio') return 'm4a';
  return 'jpg';
}
