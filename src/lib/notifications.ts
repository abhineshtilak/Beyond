import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { parseISO, setHours, setMinutes, setSeconds, isBefore, addDays } from 'date-fns';

// Detect Expo Go — push registration is removed in SDK 53+, and just importing
// `expo-notifications` triggers a side-effect that throws there. So we lazy-require.
export const isExpoGo = Constants.executionEnvironment === 'storeClient';

let cached: any = null;
function getMod(): any | null {
  if (isExpoGo) return null;
  if (cached) return cached;
  try {
    cached = require('expo-notifications');
    return cached;
  } catch {
    return null;
  }
}

export async function ensurePermission(): Promise<boolean> {
  const N = getMod();
  if (!N) return false;
  try {
    const settings = await N.getPermissionsAsync();
    if (settings.granted) return true;
    const req = await N.requestPermissionsAsync();
    return !!req.granted;
  } catch {
    return false;
  }
}

export function configureHandler() {
  const N = getMod();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      N.setNotificationChannelAsync('default', {
        name: 'Reminders',
        importance: N.AndroidImportance?.HIGH ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        // Omit `sound` to use the system default notification tone — passing 'default' here
        // is interpreted as a custom asset name that must be bundled at build time.
      }).catch(() => {});
    }
  } catch {}
}

function parseHM(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export async function scheduleWeekly(
  title: string,
  body: string,
  time: string,
  daysOfWeek: number[],
): Promise<string[]> {
  const N = getMod();
  if (!N) return [];
  const hm = parseHM(time);
  if (!hm) return [];
  if (!(await ensurePermission())) return [];
  const ids: string[] = [];
  for (const d of daysOfWeek) {
    try {
      const id = await N.scheduleNotificationAsync({
        content: { title, body },
        trigger: {
          type: N.SchedulableTriggerInputTypes.WEEKLY,
          weekday: d + 1, // Expo: 1=Sun..7=Sat
          hour: hm.hour,
          minute: hm.minute,
        },
      });
      ids.push(id);
    } catch {}
  }
  return ids;
}

export async function scheduleOnce(
  title: string,
  body: string,
  dueDate: string,
  time: string,
): Promise<string | null> {
  const N = getMod();
  if (!N) return null;
  const hm = parseHM(time);
  if (!hm) return null;
  if (!(await ensurePermission())) return null;
  try {
    let target = setSeconds(setMinutes(setHours(parseISO(dueDate), hm.hour), hm.minute), 0);
    if (isBefore(target, new Date())) target = addDays(target, 1);
    const id = await N.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: target,
      },
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancel(id: string | null | undefined): Promise<void> {
  const N = getMod();
  if (!N || !id) return;
  try { await N.cancelScheduledNotificationAsync(id); } catch {}
}

export async function cancelMany(ids: string[] | null | undefined): Promise<void> {
  if (!ids?.length) return;
  for (const id of ids) await cancel(id);
}
