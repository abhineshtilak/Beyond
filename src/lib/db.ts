import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDB() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('lifeos.db');
  return dbPromise;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some((r) => r.name === column);
}

async function runMigrations() {
  const db = await getDB();
  if (!(await columnExists('habits', 'target_days'))) {
    await db.runAsync(`ALTER TABLE habits ADD COLUMN target_days INTEGER DEFAULT 30`);
  }
  if (!(await columnExists('goals', 'hero_image_uri'))) {
    await db.runAsync(`ALTER TABLE goals ADD COLUMN hero_image_uri TEXT`);
  }
  if (!(await columnExists('goals', 'manual_progress'))) {
    await db.runAsync(`ALTER TABLE goals ADD COLUMN manual_progress INTEGER`);
  }
  if (!(await columnExists('goals', 'feeling'))) {
    await db.runAsync(`ALTER TABLE goals ADD COLUMN feeling TEXT`);
  }
  // Realizations: rich content + media
  if (!(await columnExists('realizations', 'title'))) {
    await db.runAsync(`ALTER TABLE realizations ADD COLUMN title TEXT`);
  }
  if (!(await columnExists('realizations', 'body_html'))) {
    await db.runAsync(`ALTER TABLE realizations ADD COLUMN body_html TEXT`);
  }
  if (!(await columnExists('realizations', 'attachments'))) {
    await db.runAsync(`ALTER TABLE realizations ADD COLUMN attachments TEXT`);
  }
  // Dreams: media bag
  if (!(await columnExists('dreams', 'attachments'))) {
    await db.runAsync(`ALTER TABLE dreams ADD COLUMN attachments TEXT`);
  }
  // Habits: reminders
  if (!(await columnExists('habits', 'reminder_time'))) {
    await db.runAsync(`ALTER TABLE habits ADD COLUMN reminder_time TEXT`);
  }
  if (!(await columnExists('habits', 'reminder_days'))) {
    await db.runAsync(`ALTER TABLE habits ADD COLUMN reminder_days TEXT`);
  }
  if (!(await columnExists('habits', 'notification_ids'))) {
    await db.runAsync(`ALTER TABLE habits ADD COLUMN notification_ids TEXT`);
  }
  // Tasks: reminders
  if (!(await columnExists('tasks', 'reminder_time'))) {
    await db.runAsync(`ALTER TABLE tasks ADD COLUMN reminder_time TEXT`);
  }
  if (!(await columnExists('tasks', 'notification_id'))) {
    await db.runAsync(`ALTER TABLE tasks ADD COLUMN notification_id TEXT`);
  }
  // People: contributions, future plans, contact reminders
  if (!(await columnExists('people', 'contributions'))) {
    await db.runAsync(`ALTER TABLE people ADD COLUMN contributions TEXT`);
  }
  if (!(await columnExists('people', 'future_plans'))) {
    await db.runAsync(`ALTER TABLE people ADD COLUMN future_plans TEXT`);
  }
  if (!(await columnExists('people', 'last_contact_date'))) {
    await db.runAsync(`ALTER TABLE people ADD COLUMN last_contact_date TEXT`);
  }
  if (!(await columnExists('people', 'contact_reminder_days'))) {
    await db.runAsync(`ALTER TABLE people ADD COLUMN contact_reminder_days INTEGER`);
  }
  if (!(await columnExists('people', 'notification_id'))) {
    await db.runAsync(`ALTER TABLE people ADD COLUMN notification_id TEXT`);
  }
  // Learning: target, status, attachments, goal link, reminders
  if (!(await columnExists('learning', 'target_date'))) {
    await db.runAsync(`ALTER TABLE learning ADD COLUMN target_date TEXT`);
  }
  if (!(await columnExists('learning', 'status'))) {
    await db.runAsync(`ALTER TABLE learning ADD COLUMN status TEXT DEFAULT 'active'`);
  }
  if (!(await columnExists('learning', 'attachments'))) {
    await db.runAsync(`ALTER TABLE learning ADD COLUMN attachments TEXT`);
  }
  if (!(await columnExists('learning', 'goal_id'))) {
    await db.runAsync(`ALTER TABLE learning ADD COLUMN goal_id TEXT`);
  }
  if (!(await columnExists('learning', 'reminder_time'))) {
    await db.runAsync(`ALTER TABLE learning ADD COLUMN reminder_time TEXT`);
  }
  if (!(await columnExists('learning', 'reminder_days'))) {
    await db.runAsync(`ALTER TABLE learning ADD COLUMN reminder_days TEXT`);
  }
  if (!(await columnExists('learning', 'notification_ids'))) {
    await db.runAsync(`ALTER TABLE learning ADD COLUMN notification_ids TEXT`);
  }
  // Profile + settings tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      pronouns TEXT,
      birthday TEXT,
      photo_uri TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      entry_date TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      body_html TEXT,
      content TEXT,
      attachments TEXT,
      prompt_key TEXT,
      mood TEXT,
      starred INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(entry_date);
    CREATE INDEX IF NOT EXISTS idx_journal_created ON journal_entries(created_at);
  `);
}

export async function initDB() {
  const db = await getDB();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT,
      category TEXT,
      priority INTEGER DEFAULT 2,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      goal_id TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      category TEXT,
      goal_id TEXT,
      target_days INTEGER DEFAULT 30,
      created_at INTEGER NOT NULL,
      archived INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      log_date TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 1,
      UNIQUE(habit_id, log_date),
      FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      target_date TEXT,
      priority INTEGER DEFAULT 2,
      why TEXT,
      feeling TEXT,
      current_position TEXT,
      problems TEXT,
      procedure TEXT,
      hero_image_uri TEXT,
      progress INTEGER DEFAULT 0,
      manual_progress INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inspirations (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'note',
      content TEXT,
      image_uri TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      title TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      order_idx INTEGER DEFAULT 0,
      FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS diary (
      id TEXT PRIMARY KEY,
      entry_date TEXT NOT NULL UNIQUE,
      summary TEXT,
      good TEXT,
      bad TEXT,
      learned TEXT,
      progress TEXT,
      happy TEXT,
      mood TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS realizations (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'realization',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dreams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      why TEXT,
      image_uri TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS future_plans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      planned_date TEXT,
      image_uri TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      relation TEXT,
      photo_uri TEXT,
      notes TEXT,
      their_goals TEXT,
      their_struggles TEXT,
      my_support TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      progress INTEGER DEFAULT 0,
      notes TEXT,
      resources TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hour_logs (
      id TEXT PRIMARY KEY,
      log_date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      activity TEXT NOT NULL,
      category TEXT,
      UNIQUE(log_date, hour)
    );
  `);
  await runMigrations();
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
