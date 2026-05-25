/**
 * Widget task handler — runs as a headless JS task.
 * Has full access to native modules (SQLite, Linking) but NO React UI context.
 *
 * The `registerWidgetTaskHandler` call at the bottom of this file runs as
 * a module side-effect. The module must be imported eagerly by something
 * in the app's main entry chain (we import it from `src/app/_layout.tsx`).
 */
import React from 'react';
import { Linking } from 'react-native';
import {
  registerWidgetTaskHandler,
  type WidgetTaskHandler,
} from 'react-native-android-widget';
import * as SQLite from 'expo-sqlite';
import { format } from 'date-fns';

import { TasksWidget } from './TasksWidget';
import type { WidgetTask } from './TasksWidget';
import { HabitsWidget } from './HabitsWidget';
import type { WidgetHabit } from './HabitsWidget';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ymd(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}

async function openDB() {
  return SQLite.openDatabaseAsync('lifeos.db');
}

// ─── Data fetchers ────────────────────────────────────────────────────────────
async function fetchTasks(): Promise<{
  tasks: WidgetTask[];
  pendingCount: number;
  completedCount: number;
}> {
  const db = await openDB();
  const today = ymd();
  try {
    // Mark overdue as missed (mirrors repo behavior)
    await db.runAsync(
      `UPDATE tasks SET status = 'missed'
       WHERE status = 'pending' AND due_date IS NOT NULL AND due_date < ?`,
      [today],
    );

    const rows = await db.getAllAsync<{
      id: string;
      title: string;
      status: string;
      priority: number;
    }>(
      `SELECT id, title, status, priority FROM tasks
       WHERE status IN ('pending', 'completed')
         AND (due_date = ? OR due_date IS NULL)
       ORDER BY
         CASE status WHEN 'completed' THEN 1 ELSE 0 END,
         priority DESC,
         created_at DESC
       LIMIT 10`,
      [today],
    );

    const tasks: WidgetTask[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      completed: r.status === 'completed',
      priority: (r.priority as 1 | 2 | 3) ?? 2,
    }));

    return {
      tasks,
      pendingCount: rows.filter((r) => r.status === 'pending').length,
      completedCount: rows.filter((r) => r.status === 'completed').length,
    };
  } finally {
    await db.closeAsync();
  }
}

async function fetchHabits(): Promise<{
  habits: WidgetHabit[];
  doneCount: number;
  totalCount: number;
}> {
  const db = await openDB();
  const today = ymd();
  try {
    const rows = await db.getAllAsync<{
      id: string;
      title: string;
      color: string | null;
    }>(
      `SELECT id, title, color FROM habits WHERE archived = 0 ORDER BY created_at ASC`,
    );

    const doneRows = await db.getAllAsync<{ habit_id: string }>(
      `SELECT habit_id FROM habit_logs WHERE log_date = ? AND done = 1`,
      [today],
    );
    const doneSet = new Set(doneRows.map((r) => r.habit_id));

    const habits: WidgetHabit[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      color: r.color ?? '#A8B89F',
      doneToday: doneSet.has(r.id),
    }));

    return {
      habits,
      doneCount: habits.filter((h) => h.doneToday).length,
      totalCount: habits.length,
    };
  } finally {
    await db.closeAsync();
  }
}

// ─── Click handler ────────────────────────────────────────────────────────────
async function handleClick(clickAction: string | undefined): Promise<void> {
  const url =
    clickAction === 'OPEN_TASKS'  ? 'myapp://tasks'  :
    clickAction === 'OPEN_HABITS' ? 'myapp://habits' :
    'myapp://';
  await Linking.openURL(url).catch(() => {});
}

// ─── JSX renderers (exported for use by requestWidgetUpdate from inside app) ──
export async function renderTasksJSX(): Promise<React.JSX.Element> {
  const data = await fetchTasks();
  return <TasksWidget {...data} />;
}

export async function renderHabitsJSX(): Promise<React.JSX.Element> {
  const data = await fetchHabits();
  return <HabitsWidget {...data} />;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export const widgetTaskHandler: WidgetTaskHandler = async (props) => {
  const { widgetInfo, widgetAction, clickAction, renderWidget } = props;
  const { widgetName } = widgetInfo;

  if (widgetAction === 'WIDGET_DELETED') return;

  if (widgetAction === 'WIDGET_CLICK') {
    await handleClick(clickAction);
    // Refresh after click so widget reflects latest state on return
    if (widgetName === 'Tasks')  renderWidget(await renderTasksJSX());
    if (widgetName === 'Habits') renderWidget(await renderHabitsJSX());
    return;
  }

  // WIDGET_ADDED | WIDGET_UPDATE | WIDGET_RESIZED
  if (widgetName === 'Tasks')  renderWidget(await renderTasksJSX());
  if (widgetName === 'Habits') renderWidget(await renderHabitsJSX());
};

// ─── Register at module load — runs in both app and headless task contexts ────
registerWidgetTaskHandler(widgetTaskHandler);
