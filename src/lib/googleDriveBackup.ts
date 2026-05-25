import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import type { BackupFile } from '@/lib/backup';

export const DRIVE_BACKUP_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const TOKEN_KEY = 'googleDriveBackupToken';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_PREFIX = 'lifeos-backup-';

type StoredToken = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  issuedAt: number;
  tokenType?: string;
  scope?: string;
};

export type GoogleClientIds = {
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
};

export type DriveBackupMetadata = {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
};

export type GoogleAuthToken = StoredToken;

export function getGoogleClientIds(): GoogleClientIds {
  const extra = Constants.expoConfig?.extra as
    | { googleDrive?: GoogleClientIds; google?: GoogleClientIds }
    | undefined;
  const ids = extra?.googleDrive ?? extra?.google ?? {};
  return {
    webClientId: cleanClientId(ids.webClientId),
    iosClientId: cleanClientId(ids.iosClientId),
    androidClientId: cleanClientId(ids.androidClientId),
  };
}

export function hasGoogleClientId(ids = getGoogleClientIds()): boolean {
  if (Platform.OS === 'android') return !!ids.androidClientId || !!ids.webClientId;
  if (Platform.OS === 'ios') return !!ids.iosClientId || !!ids.webClientId;
  return !!ids.webClientId;
}

export function clientIdForRefresh(ids = getGoogleClientIds()): string | null {
  if (Platform.OS === 'android') return ids.androidClientId ?? ids.webClientId ?? null;
  if (Platform.OS === 'ios') return ids.iosClientId ?? ids.webClientId ?? null;
  return ids.webClientId ?? null;
}

export function nativeGoogleRedirectUri(): string | undefined {
  const config = Constants.expoConfig;
  const appId = Platform.OS === 'android'
    ? config?.android?.package
    : config?.ios?.bundleIdentifier;
  return appId ? `${appId}:/oauthredirect` : undefined;
}

export async function saveAuthToken(token: StoredToken): Promise<void> {
  const next: StoredToken = {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresIn: token.expiresIn,
    issuedAt: token.issuedAt,
    tokenType: token.tokenType,
    scope: token.scope,
  };
  const existing = await getStoredToken();
  await SecureStore.setItemAsync(
    TOKEN_KEY,
    JSON.stringify({
      ...next,
      refreshToken: next.refreshToken ?? existing?.refreshToken,
    }),
  );
}

export async function signOutGoogleDrive(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredToken(): Promise<StoredToken | null> {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredToken;
    return parsed.accessToken ? parsed : null;
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const stored = await getStoredToken();
  if (!stored) return null;
  if (isTokenFresh(stored, 60)) return stored.accessToken;

  const refreshToken = stored.refreshToken;
  const clientId = clientIdForRefresh();
  if (!refreshToken || !clientId) return null;

  const refreshed = await refreshGoogleAccessToken(clientId, refreshToken);
  await saveAuthToken({ ...refreshed, refreshToken });
  return refreshed.accessToken;
}

export async function uploadBackupToDrive(payload: BackupFile): Promise<DriveBackupMetadata> {
  const accessToken = await requireAccessToken();
  const name = `${BACKUP_PREFIX}${payload.createdAt.replace(/[:.]/g, '-')}.json`;
  const metadata = {
    name,
    mimeType: 'application/json',
    parents: ['appDataFolder'],
    appProperties: {
      app: 'Beyond',
      backupVersion: String(payload.version),
    },
  };
  const boundary = `lifeos-${Date.now()}`;
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(payload),
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,createdTime,modifiedTime,size`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  return driveJson<DriveBackupMetadata>(res);
}

export async function listDriveBackups(): Promise<DriveBackupMetadata[]> {
  const accessToken = await requireAccessToken();
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    pageSize: '10',
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,createdTime,modifiedTime,size)',
    q: `name contains '${BACKUP_PREFIX}' and trashed = false`,
  });
  const res = await fetch(`${DRIVE_API}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await driveJson<{ files: DriveBackupMetadata[] }>(res);
  return data.files ?? [];
}

export async function downloadLatestBackupFromDrive(): Promise<BackupFile | null> {
  const backups = await listDriveBackups();
  const latest = backups[0];
  if (!latest) return null;
  return downloadBackupFromDrive(latest.id);
}

export async function downloadBackupFromDrive(fileId: string): Promise<BackupFile> {
  const accessToken = await requireAccessToken();
  const res = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return driveJson<BackupFile>(res);
}

async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Connect Google Drive before backing up.');
  return token;
}

async function driveJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = `Google Drive request failed (${res.status})`;
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      message = parsed.error?.message ?? message;
    } catch {}
    throw new Error(message);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

async function refreshGoogleAccessToken(clientId: string, refreshToken: string): Promise<StoredToken> {
  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch(GOOGLE_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await driveJson<{
    access_token: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  }>(res);
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    issuedAt: Math.floor(Date.now() / 1000),
    tokenType: data.token_type,
    scope: data.scope,
  };
}

function isTokenFresh(token: Pick<StoredToken, 'expiresIn' | 'issuedAt'>, secondsMargin: number) {
  if (!token.expiresIn) return true;
  const expiresAt = token.issuedAt + token.expiresIn;
  return expiresAt - secondsMargin > Math.floor(Date.now() / 1000);
}

function cleanClientId(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
