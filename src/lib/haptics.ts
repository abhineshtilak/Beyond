import * as ExpoHaptics from 'expo-haptics';
import { areHapticsEnabled } from './preferences';

export const ImpactFeedbackStyle: typeof ExpoHaptics.ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType: typeof ExpoHaptics.NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

export async function impactAsync(style: Parameters<typeof ExpoHaptics.impactAsync>[0]): Promise<void> {
  if (!areHapticsEnabled()) return;
  return ExpoHaptics.impactAsync(style);
}

export async function selectionAsync(): Promise<void> {
  if (!areHapticsEnabled()) return;
  return ExpoHaptics.selectionAsync();
}

export async function notificationAsync(type: Parameters<typeof ExpoHaptics.notificationAsync>[0]): Promise<void> {
  if (!areHapticsEnabled()) return;
  return ExpoHaptics.notificationAsync(type);
}
