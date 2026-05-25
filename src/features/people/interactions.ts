import { getDB, uid } from '@/lib/db';
import { ymd } from '@/lib/date';
import * as repo from './repo';
import type { PersonInteraction, InteractionInput, InteractionMood, InteractionMedium } from './types';

type Row = {
  id: string;
  person_id: string;
  log_date: string;
  notes: string | null;
  mood: string | null;
  medium: string | null;
  duration_mins: number | null;
  created_at: number;
};

const toInteraction = (r: Row): PersonInteraction => ({
  id: r.id,
  personId: r.person_id,
  logDate: r.log_date,
  notes: r.notes,
  mood: (r.mood as InteractionMood) ?? null,
  medium: (r.medium as InteractionMedium) ?? null,
  durationMins: r.duration_mins,
  createdAt: r.created_at,
});

export async function logInteraction(
  personId: string,
  input: InteractionInput,
): Promise<PersonInteraction> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  const today = ymd();
  await db.runAsync(
    `INSERT INTO person_interactions (id, person_id, log_date, notes, mood, medium, duration_mins, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, personId, today,
      input.notes ?? null, input.mood ?? null, input.medium ?? null,
      input.durationMins ?? null, now,
    ],
  );
  // Auto-update last contact date
  await repo.markContacted(personId);
  const row = await db.getFirstAsync<Row>(
    `SELECT * FROM person_interactions WHERE id = ?`, [id],
  );
  return toInteraction(row!);
}

export async function listForPerson(
  personId: string,
  limit = 20,
): Promise<PersonInteraction[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM person_interactions WHERE person_id = ?
     ORDER BY log_date DESC, created_at DESC LIMIT ?`,
    [personId, limit],
  );
  return rows.map(toInteraction);
}

export async function deleteInteraction(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM person_interactions WHERE id = ?`, [id]);
}
