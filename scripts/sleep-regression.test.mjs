import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  blockedHoursOnPreviousDate,
  blockedHoursOnWakeDate,
  calculateSleepDuration,
} from '../src/features/hours/sleepMath.ts';

const CREATE_SLEEP_ENTRIES = `
  CREATE TABLE sleep_entries (
    id            TEXT PRIMARY KEY,
    wake_date     TEXT NOT NULL,
    sleep_hour    INTEGER NOT NULL,
    sleep_minute  INTEGER NOT NULL,
    wake_hour     INTEGER NOT NULL,
    wake_minute   INTEGER NOT NULL,
    duration_mins INTEGER NOT NULL,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
  )
`;

function createDatabase() {
  const database = new DatabaseSync(':memory:');
  database.exec(CREATE_SLEEP_ENTRIES);
  return database;
}

function insertSleep(database, id, wakeDate, input, timestamp) {
  database.prepare(`
    INSERT INTO sleep_entries (
      id, wake_date, sleep_hour, sleep_minute, wake_hour, wake_minute,
      duration_mins, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    wakeDate,
    input.sleepHour,
    input.sleepMinute,
    input.wakeHour,
    input.wakeMinute,
    calculateSleepDuration(input),
    timestamp,
    timestamp,
  );
}

function totalForDate(database, wakeDate) {
  return database.prepare(`
    SELECT COALESCE(SUM(duration_mins), 0) AS total
    FROM sleep_entries
    WHERE wake_date = ?
  `).get(wakeDate).total;
}

test('overnight sleep belongs entirely to its wake date', () => {
  const sleep = {
    sleepHour: 22,
    sleepMinute: 0,
    wakeHour: 8,
    wakeMinute: 0,
  };

  assert.equal(calculateSleepDuration(sleep), 10 * 60);
  assert.deepEqual(blockedHoursOnWakeDate(sleep), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(blockedHoursOnPreviousDate(sleep), [22, 23]);
});

test('June 8 create, edit, and delete never changes June 6 totals', () => {
  const database = createDatabase();
  const june6Sleep = {
    sleepHour: 22,
    sleepMinute: 0,
    wakeHour: 8,
    wakeMinute: 0,
  };
  const june8Sleep = {
    sleepHour: 22,
    sleepMinute: 30,
    wakeHour: 7,
    wakeMinute: 15,
  };

  insertSleep(database, 'sleep-june-6', '2026-06-06', june6Sleep, 1);
  assert.equal(totalForDate(database, '2026-06-06'), 10 * 60);
  assert.equal(totalForDate(database, '2026-06-05'), 0);

  insertSleep(database, 'sleep-june-8', '2026-06-08', june8Sleep, 2);
  assert.equal(totalForDate(database, '2026-06-06'), 10 * 60);
  assert.equal(totalForDate(database, '2026-06-08'), 8 * 60 + 45);

  const editedJune8 = {
    sleepHour: 23,
    sleepMinute: 15,
    wakeHour: 6,
    wakeMinute: 45,
  };
  database.prepare(`
    UPDATE sleep_entries
    SET sleep_hour = ?, sleep_minute = ?, wake_hour = ?, wake_minute = ?,
        duration_mins = ?, updated_at = ?
    WHERE id = ?
  `).run(
    editedJune8.sleepHour,
    editedJune8.sleepMinute,
    editedJune8.wakeHour,
    editedJune8.wakeMinute,
    calculateSleepDuration(editedJune8),
    3,
    'sleep-june-8',
  );
  assert.equal(totalForDate(database, '2026-06-06'), 10 * 60);
  assert.equal(totalForDate(database, '2026-06-08'), 7 * 60 + 30);

  database.prepare(`DELETE FROM sleep_entries WHERE id = ?`).run('sleep-june-8');
  assert.equal(totalForDate(database, '2026-06-06'), 10 * 60);
  assert.equal(totalForDate(database, '2026-06-08'), 0);
});
