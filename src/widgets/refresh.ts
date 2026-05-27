/**
 * Lightweight widget refresh helpers — safe to call from anywhere in the app.
 * Fire-and-forget: import and call, never await at call sites.
 * No-ops on iOS / when the native module is unavailable (e.g. Expo Go).
 */
import { Platform } from 'react-native';

type Which = 'habits' | 'tasks' | 'all';

export function refreshWidgets(which: Which = 'all'): void {
  if (Platform.OS !== 'android') return;
  _refresh(which).catch(() => {});
}

async function _refresh(which: Which): Promise<void> {
  const [{ requestWidgetUpdate }, { renderHabitsJSX, renderTasksJSX }] =
    await Promise.all([
      import('react-native-android-widget'),
      import('./widgetTaskHandler'),
    ]);

  const jobs: Promise<void>[] = [];

  if (which === 'habits' || which === 'all') {
    jobs.push(
      requestWidgetUpdate({
        widgetName: 'Habits',
        renderWidget: () => renderHabitsJSX(),
      }),
    );
  }

  if (which === 'tasks' || which === 'all') {
    jobs.push(
      requestWidgetUpdate({
        widgetName: 'Tasks',
        renderWidget: () => renderTasksJSX(),
      }),
    );
  }

  await Promise.all(jobs);
}
