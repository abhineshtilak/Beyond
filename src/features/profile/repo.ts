import { getDB } from '@/lib/db';

export type Profile = {
  name: string | null;
  pronouns: string | null;
  birthday: string | null; // YYYY-MM-DD
  photoUri: string | null;
};

export async function get(): Promise<Profile> {
  const db = await getDB();
  const row = await db.getFirstAsync<{
    name: string | null;
    pronouns: string | null;
    birthday: string | null;
    photo_uri: string | null;
  }>(`SELECT name, pronouns, birthday, photo_uri FROM profile WHERE id = 1`);
  if (!row) return { name: null, pronouns: null, birthday: null, photoUri: null };
  return {
    name: row.name,
    pronouns: row.pronouns,
    birthday: row.birthday,
    photoUri: row.photo_uri,
  };
}

export async function upsert(patch: Partial<Profile>): Promise<void> {
  const db = await getDB();
  const existing = await get();
  const merged = {
    name: patch.name !== undefined ? patch.name : existing.name,
    pronouns: patch.pronouns !== undefined ? patch.pronouns : existing.pronouns,
    birthday: patch.birthday !== undefined ? patch.birthday : existing.birthday,
    photoUri: patch.photoUri !== undefined ? patch.photoUri : existing.photoUri,
  };
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO profile (id, name, pronouns, birthday, photo_uri, created_at)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, pronouns = excluded.pronouns, birthday = excluded.birthday, photo_uri = excluded.photo_uri`,
    [merged.name, merged.pronouns, merged.birthday, merged.photoUri, now],
  );
}

export function ageFromBirthday(b: string | null): number | null {
  if (!b) return null;
  const today = new Date();
  const bd = new Date(b);
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
}
