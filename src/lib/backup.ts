import * as FileSystem from 'expo-file-system/legacy';
import { format } from 'date-fns';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { getDB, initDB } from '@/lib/db';

// Guard native-module-dependent packages using requireOptionalNativeModule.
// In RN 0.83 / New Architecture, expo-sharing and expo-document-picker eagerly call
// requireNativeModule() at the module top-level, which throws *before* a try/catch
// around require() can intercept it. requireOptionalNativeModule is Expo's safe API
// that returns null instead of throwing when the native side isn't linked.

let SharingMod: any = undefined;     // undefined = not yet checked
let DocumentPickerMod: any = undefined;

function getSharing(): any | null {
  if (SharingMod !== undefined) return SharingMod;
  // First check if the native module exists without throwing
  const native = requireOptionalNativeModule('ExpoSharing');
  if (!native) { SharingMod = null; return null; }
  try {
    SharingMod = require('expo-sharing');
  } catch {
    SharingMod = null;
  }
  return SharingMod;
}

function getDocumentPicker(): any | null {
  if (DocumentPickerMod !== undefined) return DocumentPickerMod;
  const native = requireOptionalNativeModule('ExpoDocumentPicker');
  if (!native) { DocumentPickerMod = null; return null; }
  try {
    DocumentPickerMod = require('expo-document-picker');
  } catch {
    DocumentPickerMod = null;
  }
  return DocumentPickerMod;
}

const REBUILD_MSG =
  'Backup needs a rebuilt dev client. Run: eas build --profile development --platform android  — then install the new APK.';

export const BACKUP_VERSION = 1;

const TABLES = [
  'tasks',
  'habits',
  'habit_logs',
  'goals',
  'inspirations',
  'milestones',
  'diary',
  'realizations',
  'dreams',
  'future_plans',
  'people',
  'learning',
  'hour_logs',
  'profile',
  'settings',
  'journal_entries',
] as const;

type TableName = (typeof TABLES)[number];
type DbRow = Record<string, string | number | null>;

export type BackupFile = {
  app: 'LifeOS';
  version: number;
  createdAt: string;
  tables: Record<TableName, DbRow[]>;
  files: BackupMediaFile[];
};

export type BackupMediaFile = {
  id: string;
  originalUri: string;
  fileName: string;
  base64: string;
};

export type BackupSummary = {
  createdAt: string;
  rowCount: number;
  fileCount: number;
  skippedFileCount: number;
};

type MediaRef = {
  table: TableName;
  rowIndex: number;
  column: string;
  uri: string;
  attachmentIndex?: number;
};

const ATTACHMENT_TABLES: { table: TableName; column: string }[] = [
  { table: 'realizations', column: 'attachments' },
  { table: 'dreams', column: 'attachments' },
  { table: 'learning', column: 'attachments' },
  { table: 'journal_entries', column: 'attachments' },
];

const URI_COLUMNS: { table: TableName; column: string }[] = [
  { table: 'profile', column: 'photo_uri' },
  { table: 'people', column: 'photo_uri' },
  { table: 'goals', column: 'hero_image_uri' },
  { table: 'inspirations', column: 'image_uri' },
  { table: 'dreams', column: 'image_uri' },
  { table: 'future_plans', column: 'image_uri' },
];

export async function createBackup(): Promise<{ payload: BackupFile; summary: BackupSummary }> {
  const db = await getDB();
  const tables = {} as Record<TableName, DbRow[]>;
  let rowCount = 0;

  for (const table of TABLES) {
    const rows = await db.getAllAsync<DbRow>(`SELECT * FROM ${table}`);
    tables[table] = rows;
    rowCount += rows.length;
  }

  const mediaRefs = collectMediaRefs(tables);
  const files: BackupMediaFile[] = [];
  let skippedFileCount = 0;
  const byUri = new Map<string, string>();

  for (const ref of mediaRefs) {
    const existingId = byUri.get(ref.uri);
    if (existingId) {
      replaceMediaUri(tables, ref, backupUri(existingId));
      continue;
    }

    try {
      const info = await FileSystem.getInfoAsync(ref.uri);
      if (!info.exists || info.isDirectory) throw new Error('File is not readable');
      const id = `media_${files.length + 1}`;
      const base64 = await FileSystem.readAsStringAsync(ref.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      files.push({
        id,
        originalUri: ref.uri,
        fileName: fileNameFromUri(ref.uri, id),
        base64,
      });
      byUri.set(ref.uri, id);
      replaceMediaUri(tables, ref, backupUri(id));
    } catch {
      skippedFileCount += 1;
    }
  }

  const createdAt = new Date().toISOString();
  return {
    payload: {
      app: 'LifeOS',
      version: BACKUP_VERSION,
      createdAt,
      tables,
      files,
    },
    summary: {
      createdAt,
      rowCount,
      fileCount: files.length,
      skippedFileCount,
    },
  };
}

export async function restoreBackup(payload: BackupFile): Promise<BackupSummary> {
  validateBackup(payload);
  await initDB();

  const restoredUriById = new Map<string, string>();
  const mediaDir = `${FileSystem.documentDirectory}restored-media/`;
  await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });

  for (const file of payload.files) {
    const safeName = `${file.id}-${file.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uri = `${mediaDir}${safeName}`;
    await FileSystem.writeAsStringAsync(uri, file.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    restoredUriById.set(file.id, uri);
  }

  const tables = JSON.parse(JSON.stringify(payload.tables)) as Record<TableName, DbRow[]>;
  rewriteBackupUris(tables, restoredUriById);

  const db = await getDB();
  await db.withTransactionAsync(async () => {
    await db.execAsync('PRAGMA foreign_keys = OFF');
    for (const table of [...TABLES].reverse()) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    for (const table of TABLES) {
      const existingColumns = await tableColumns(table);
      for (const row of tables[table] ?? []) {
        const columns = Object.keys(row).filter((column) => existingColumns.has(column));
        if (columns.length === 0) continue;
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((column) => row[column]);
        await db.runAsync(
          `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          values,
        );
      }
    }
    await db.execAsync('PRAGMA foreign_keys = ON');
  });

  return {
    createdAt: payload.createdAt,
    rowCount: TABLES.reduce((sum, table) => sum + (payload.tables[table]?.length ?? 0), 0),
    fileCount: payload.files.length,
    skippedFileCount: 0,
  };
}

export function backupSummaryFromPayload(payload: BackupFile): BackupSummary {
  validateBackup(payload);
  return {
    createdAt: payload.createdAt,
    rowCount: TABLES.reduce((sum, table) => sum + (payload.tables[table]?.length ?? 0), 0),
    fileCount: payload.files.length,
    skippedFileCount: 0,
  };
}

function collectMediaRefs(tables: Record<TableName, DbRow[]>): MediaRef[] {
  const refs: MediaRef[] = [];
  for (const { table, column } of URI_COLUMNS) {
    tables[table]?.forEach((row, rowIndex) => {
      const uri = row[column];
      if (typeof uri === 'string' && uri.length > 0) refs.push({ table, rowIndex, column, uri });
    });
  }
  for (const { table, column } of ATTACHMENT_TABLES) {
    tables[table]?.forEach((row, rowIndex) => {
      const attachments = parseArray(row[column]);
      attachments.forEach((attachment, attachmentIndex) => {
        if (attachment && typeof attachment.uri === 'string' && attachment.uri.length > 0) {
          refs.push({ table, rowIndex, column, uri: attachment.uri, attachmentIndex });
        }
      });
    });
  }
  return refs;
}

function replaceMediaUri(tables: Record<TableName, DbRow[]>, ref: MediaRef, uri: string) {
  const row = tables[ref.table]?.[ref.rowIndex];
  if (!row) return;
  if (ref.attachmentIndex === undefined) {
    row[ref.column] = uri;
    return;
  }
  const attachments = parseArray(row[ref.column]);
  if (attachments[ref.attachmentIndex]) {
    attachments[ref.attachmentIndex] = { ...attachments[ref.attachmentIndex], uri };
    row[ref.column] = JSON.stringify(attachments);
  }
}

function rewriteBackupUris(tables: Record<TableName, DbRow[]>, restoredUriById: Map<string, string>) {
  for (const ref of collectMediaRefs(tables)) {
    const id = parseBackupUri(ref.uri);
    if (!id) continue;
    const restoredUri = restoredUriById.get(id);
    if (restoredUri) replaceMediaUri(tables, ref, restoredUri);
  }
}

async function tableColumns(table: TableName): Promise<Set<string>> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return new Set(rows.map((row) => row.name));
}

function validateBackup(payload: BackupFile) {
  if (!payload || payload.app !== 'LifeOS' || payload.version !== BACKUP_VERSION || !payload.tables) {
    throw new Error('This backup file is not compatible with this version of the app.');
  }
}

function parseArray(raw: unknown): Record<string, unknown>[] {
  if (typeof raw !== 'string' || raw.length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function backupUri(id: string) {
  return `backup-media://${id}`;
}

function parseBackupUri(uri: string) {
  return uri.startsWith('backup-media://') ? uri.replace('backup-media://', '') : null;
}

function fileNameFromUri(uri: string, fallback: string) {
  const clean = uri.split('?')[0];
  const name = clean.split('/').pop();
  return name && name.includes('.') ? name : `${fallback}.bin`;
}

/* ---------- High-level helpers wired to the system share sheet + document picker ---------- */

/** Build a backup, write it to a file, and open the system share sheet so the user can
 *  send it to Google Drive / iCloud / wherever. */
export async function exportToFile(): Promise<{ ok: boolean; summary?: BackupSummary; reason?: string }> {
  const Sharing = getSharing();
  if (!Sharing) {
    return { ok: false, reason: REBUILD_MSG };
  }
  try {
    const { payload, summary } = await createBackup();
    const json = JSON.stringify(payload);
    const filename = `beyond-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      return { ok: false, reason: 'Sharing is not available on this device.' };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Save your Beyond backup',
      UTI: 'public.json',
    });

    return { ok: true, summary };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? 'Could not create backup.' };
  }
}

/** Let the user pick a previously-exported backup and restore it. Replaces existing data. */
export async function importFromFile(): Promise<{ ok: boolean; summary?: BackupSummary; reason?: string }> {
  const DocumentPicker = getDocumentPicker();
  if (!DocumentPicker) {
    return { ok: false, reason: REBUILD_MSG };
  }
  try {
    const pick = await DocumentPicker.getDocumentAsync({
      type: ['application/json', '*/*'],
      copyToCacheDirectory: true,
    });
    if (pick.canceled) return { ok: false, reason: 'cancelled' };

    const file = pick.assets?.[0];
    if (!file) return { ok: false, reason: 'No file picked.' };

    const raw = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    let payload: BackupFile;
    try {
      payload = JSON.parse(raw);
    } catch {
      return { ok: false, reason: "That doesn't look like a valid Beyond backup file." };
    }

    const summary = await restoreBackup(payload);
    return { ok: true, summary };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? 'Restore failed. Your existing data is unchanged.' };
  }
}

export function isBackupAvailable(): boolean {
  return !!(getSharing() && getDocumentPicker());
}
