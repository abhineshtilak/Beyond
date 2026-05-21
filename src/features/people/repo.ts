import { getDB, uid } from '@/lib/db';
import { ymd } from '@/lib/date';
import { addDays, parseISO, isBefore, differenceInDays } from 'date-fns';
import * as notifications from '@/lib/notifications';
import type { Person, PersonInput, Relation } from './types';

type Row = {
  id: string;
  name: string;
  relation: string | null;
  photo_uri: string | null;
  notes: string | null;
  their_goals: string | null;
  their_struggles: string | null;
  my_support: string | null;
  contributions: string | null;
  future_plans: string | null;
  last_contact_date: string | null;
  contact_reminder_days: number | null;
  notification_id: string | null;
  birthday: string | null;
  anniversary: string | null;
  created_at: number;
};

const toPerson = (r: Row): Person => ({
  id: r.id,
  name: r.name,
  relation: (r.relation as Relation) ?? null,
  photoUri: r.photo_uri,
  notes: r.notes,
  theirGoals: r.their_goals,
  theirStruggles: r.their_struggles,
  mySupport: r.my_support,
  contributions: r.contributions,
  futurePlans: r.future_plans,
  lastContactDate: r.last_contact_date,
  contactReminderDays: r.contact_reminder_days,
  notificationId: r.notification_id,
  birthday: r.birthday,
  anniversary: r.anniversary,
  createdAt: r.created_at,
});

async function scheduleReminder(person: Person): Promise<string | null> {
  await notifications.cancel(person.notificationId);
  if (!person.contactReminderDays || person.contactReminderDays <= 0) return null;
  const baseDate = person.lastContactDate ?? ymd();
  const dueDate = ymd(addDays(parseISO(baseDate), person.contactReminderDays));
  return notifications.scheduleOnce(
    `Reach out to ${person.name}`,
    'Relationships are tended, not stored. Send a message?',
    dueDate,
    '10:00',
  );
}

export async function list(): Promise<Person[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Row>(`SELECT * FROM people ORDER BY name ASC`);
  return rows.map(toPerson);
}

export async function get(id: string): Promise<Person | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<Row>(`SELECT * FROM people WHERE id = ?`, [id]);
  return row ? toPerson(row) : null;
}

export async function create(input: PersonInput): Promise<Person> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO people (id, name, relation, photo_uri, notes, their_goals, their_struggles, my_support, contributions, future_plans, last_contact_date, contact_reminder_days, birthday, anniversary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, input.name.trim(), input.relation ?? null, input.photoUri ?? null, input.notes ?? null,
      input.theirGoals ?? null, input.theirStruggles ?? null, input.mySupport ?? null,
      input.contributions ?? null, input.futurePlans ?? null,
      input.lastContactDate ?? null, input.contactReminderDays ?? null,
      input.birthday ?? null, input.anniversary ?? null,
      now,
    ],
  );
  const person = await get(id);
  if (person) {
    const nid = await scheduleReminder(person);
    if (nid) await db.runAsync(`UPDATE people SET notification_id = ? WHERE id = ?`, [nid, id]);
  }
  return (await get(id))!;
}

export async function update(id: string, patch: Partial<PersonInput>): Promise<void> {
  const db = await getDB();
  const existing = await get(id);
  if (!existing) return;
  const merged = {
    name: patch.name?.trim() ?? existing.name,
    relation: patch.relation !== undefined ? patch.relation : existing.relation,
    photoUri: patch.photoUri !== undefined ? patch.photoUri : existing.photoUri,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    theirGoals: patch.theirGoals !== undefined ? patch.theirGoals : existing.theirGoals,
    theirStruggles: patch.theirStruggles !== undefined ? patch.theirStruggles : existing.theirStruggles,
    mySupport: patch.mySupport !== undefined ? patch.mySupport : existing.mySupport,
    contributions: patch.contributions !== undefined ? patch.contributions : existing.contributions,
    futurePlans: patch.futurePlans !== undefined ? patch.futurePlans : existing.futurePlans,
    lastContactDate: patch.lastContactDate !== undefined ? patch.lastContactDate : existing.lastContactDate,
    contactReminderDays: patch.contactReminderDays !== undefined ? patch.contactReminderDays : existing.contactReminderDays,
    birthday: patch.birthday !== undefined ? patch.birthday : existing.birthday,
    anniversary: patch.anniversary !== undefined ? patch.anniversary : existing.anniversary,
  };
  await db.runAsync(
    `UPDATE people SET name = ?, relation = ?, photo_uri = ?, notes = ?, their_goals = ?, their_struggles = ?, my_support = ?, contributions = ?, future_plans = ?, last_contact_date = ?, contact_reminder_days = ?, birthday = ?, anniversary = ? WHERE id = ?`,
    [
      merged.name, merged.relation, merged.photoUri, merged.notes,
      merged.theirGoals, merged.theirStruggles, merged.mySupport,
      merged.contributions, merged.futurePlans,
      merged.lastContactDate, merged.contactReminderDays,
      merged.birthday, merged.anniversary,
      id,
    ],
  );
  const next = await get(id);
  if (next) {
    const nid = await scheduleReminder(next);
    await db.runAsync(`UPDATE people SET notification_id = ? WHERE id = ?`, [nid, id]);
  }
}

export async function markContacted(id: string): Promise<void> {
  await update(id, { lastContactDate: ymd() });
}

export async function remove(id: string): Promise<void> {
  const db = await getDB();
  const existing = await get(id);
  if (existing?.notificationId) await notifications.cancel(existing.notificationId);
  await db.runAsync(`DELETE FROM people WHERE id = ?`, [id]);
}

export function daysSinceContact(person: Person): number | null {
  if (!person.lastContactDate) return null;
  return Math.max(0, differenceInDays(new Date(), parseISO(person.lastContactDate)));
}

export function reminderDueIn(person: Person): number | null {
  if (!person.lastContactDate || !person.contactReminderDays) return null;
  const due = addDays(parseISO(person.lastContactDate), person.contactReminderDays);
  return differenceInDays(due, new Date());
}
