import type { SleepEntryInput } from './types';

const MINUTES_PER_DAY = 24 * 60;

export function timeToMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function calculateSleepDuration(input: SleepEntryInput): number {
  const sleepMinutes = timeToMinutes(input.sleepHour, input.sleepMinute);
  const wakeMinutes = timeToMinutes(input.wakeHour, input.wakeMinute);
  const duration = wakeMinutes - sleepMinutes;
  return duration > 0 ? duration : duration + MINUTES_PER_DAY;
}

export function isOvernightSleep(input: SleepEntryInput): boolean {
  return timeToMinutes(input.wakeHour, input.wakeMinute)
    <= timeToMinutes(input.sleepHour, input.sleepMinute);
}

export function validateSleepEntry(input: SleepEntryInput): string | null {
  const values = [
    input.sleepHour,
    input.sleepMinute,
    input.wakeHour,
    input.wakeMinute,
  ];
  if (values.some((value) => !Number.isInteger(value))) {
    return 'Choose a valid sleep and wake time.';
  }
  if (
    input.sleepHour < 0
    || input.sleepHour > 23
    || input.wakeHour < 0
    || input.wakeHour > 23
    || input.sleepMinute < 0
    || input.sleepMinute > 59
    || input.wakeMinute < 0
    || input.wakeMinute > 59
  ) {
    return 'Choose a valid sleep and wake time.';
  }

  const duration = calculateSleepDuration(input);
  if (duration < 30) return 'Sleep must be at least 30 minutes.';
  if (duration > 14 * 60) return 'Sleep cannot be longer than 14 hours.';
  return null;
}

function occupiedHours(startMinutes: number, endMinutes: number): number[] {
  if (endMinutes <= startMinutes) return [];
  const firstHour = Math.floor(startMinutes / 60);
  const lastHour = Math.ceil(endMinutes / 60) - 1;
  return Array.from(
    { length: lastHour - firstHour + 1 },
    (_, index) => firstHour + index,
  );
}

export function blockedHoursOnWakeDate(input: SleepEntryInput): number[] {
  const wakeMinutes = timeToMinutes(input.wakeHour, input.wakeMinute);
  if (isOvernightSleep(input)) {
    return occupiedHours(0, wakeMinutes);
  }
  return occupiedHours(
    timeToMinutes(input.sleepHour, input.sleepMinute),
    wakeMinutes,
  );
}

export function blockedHoursOnPreviousDate(input: SleepEntryInput): number[] {
  if (!isOvernightSleep(input)) return [];
  return occupiedHours(
    timeToMinutes(input.sleepHour, input.sleepMinute),
    MINUTES_PER_DAY,
  );
}

export function formatSleepTime(hour: number, minute: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function formatSleepDuration(durationMins: number): string {
  const hours = Math.floor(durationMins / 60);
  const minutes = durationMins % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}
