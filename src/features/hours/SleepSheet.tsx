/**
 * SleepSheet — redesigned sleep logger
 *
 * Layout:
 *   Duration presets   → 5h 6h 7h 8h 9h (tap to auto-set wake time)
 *   Fell asleep        → large time, ─30 / +30 min buttons
 *   Woke up            → large time, ─30 / +30 min buttons  (+1 day badge if cross-midnight)
 *   Duration summary   → live "8h 00m · Good sleep"
 *
 * Cross-midnight is handled automatically — wake is always ≥ sleep by wrapping.
 * Minimum duration: 30 min. Maximum: 14 h (prevents accidental 23h entries).
 */
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Minus, Plus, Moon } from 'lucide-react-native';
import { Sheet, SheetRef } from '@/components/Sheet';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import * as repo from './repo';

// ─── Public API ───────────────────────────────────────────────────────────────

export type SleepSheetRef = {
  present: (date: string, onSaved: () => void) => void;
  dismiss: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DURATION_PRESETS = [5, 6, 7, 8, 9]; // hours

function totalMins(hour: number, min: number) { return hour * 60 + min; }

function fmt(totalMinutes: number): string {
  // Always display in 12-hour format, wrap at 24h
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const m   = totalMinutes % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12  = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function durLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function qualityLabel(mins: number): string {
  const hrs = mins / 60;
  if (hrs < 5)  return 'Too little';
  if (hrs < 7)  return 'Short sleep';
  if (hrs <= 9) return 'Good sleep';
  return 'Long sleep';
}

function qualityColor(mins: number): string {
  const hrs = mins / 60;
  if (hrs < 6)  return '#C07870';
  if (hrs <= 9) return '#6FA882';
  return '#C8A442';
}

// ─── Time stepper ─────────────────────────────────────────────────────────────

function TimeStepper({
  label,
  totalMinutes,
  onChange,
  isNextDay,
}: {
  label: string;
  totalMinutes: number;
  onChange: (newTotal: number) => void;
  isNextDay?: boolean;
}) {
  const colors = useColors();

  const step = (delta: number) => {
    // Clamp within 0–(48h-1) for cross-midnight support
    const next = Math.max(0, Math.min(47 * 60 + 59, totalMinutes + delta));
    onChange(next);
  };

  return (
    <View style={styles.stepper}>
      <Text variant="caption" color={colors.textMuted} style={styles.stepperLabel}>
        {label.toUpperCase()}
      </Text>

      <View style={styles.stepperRow}>
        {/* – 30 min */}
        <Pressable
          onPress={() => step(-30)}
          hitSlop={8}
          style={({ pressed }) => [styles.stepBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }, pressed && { opacity: 0.6 }]}
        >
          <Minus size={16} color={colors.text} strokeWidth={2} />
        </Pressable>

        {/* Time display */}
        <View style={styles.timeDisplay}>
          <Text style={[styles.timeText, { color: colors.text }]}>
            {fmt(totalMinutes)}
          </Text>
          {isNextDay ? (
            <View style={[styles.nextDayBadge, { backgroundColor: colors.lavenderSoft }]}>
              <Text variant="caption" color={colors.lavender}>+1 day</Text>
            </View>
          ) : null}
        </View>

        {/* + 30 min */}
        <Pressable
          onPress={() => step(30)}
          hitSlop={8}
          style={({ pressed }) => [styles.stepBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }, pressed && { opacity: 0.6 }]}
        >
          <Plus size={16} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Fine +/- 15 min */}
      <View style={styles.fineRow}>
        <Pressable onPress={() => step(-15)} hitSlop={6} style={({ pressed }) => [styles.fineBtn, { borderColor: colors.hairline }, pressed && { opacity: 0.6 }]}>
          <Text variant="caption" color={colors.textMuted}>−15m</Text>
        </Pressable>
        <Pressable onPress={() => step(15)} hitSlop={6} style={({ pressed }) => [styles.fineBtn, { borderColor: colors.hairline }, pressed && { opacity: 0.6 }]}>
          <Text variant="caption" color={colors.textMuted}>+15m</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export const SleepSheet = forwardRef<SleepSheetRef>(function SleepSheet(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const colors   = useColors();
  const dateRef  = useRef('');
  const onSavedRef = useRef<() => void>(() => {});

  // Both stored as "total minutes from midnight of the reference date"
  // sleepTotal is always in [0, 23*60+59]
  // wakeTotal  is always > sleepTotal, possibly > 24*60 (next day)
  const [sleepTotal, setSleepTotal] = useState(22 * 60);    // 10:00 PM
  const [wakeTotal,  setWakeTotal]  = useState(6 * 60 + 24 * 60); // 6:00 AM next day = 30h

  // Derived
  const durMins    = Math.max(30, wakeTotal - sleepTotal);
  const wakeIsNext = wakeTotal >= 24 * 60;
  const canSave    = durMins >= 30 && durMins <= 14 * 60;

  // ── Public ─────────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    present: (date, onSaved) => {
      dateRef.current = date;
      onSavedRef.current = onSaved;
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  // ── Preset tapped ──────────────────────────────────────────────────────────
  const applyPreset = (hours: number) => {
    // Keep sleep time, move wake time
    const newWake = sleepTotal + hours * 60;
    setWakeTotal(newWake);
  };

  // ── Sleep time changed ─────────────────────────────────────────────────────
  const handleSleepChange = (newSleep: number) => {
    // Clamp sleep to [0, 23:59]
    const clamped = Math.max(0, Math.min(23 * 60 + 59, newSleep));
    setSleepTotal(clamped);
    // Keep wake ≥ sleep + 30 min
    if (wakeTotal <= clamped + 29) {
      setWakeTotal(clamped + 60);
    }
  };

  // ── Wake time changed ──────────────────────────────────────────────────────
  const handleWakeChange = (newWake: number) => {
    // Clamp: must be > sleep + 30, max 14h after sleep
    const minWake = sleepTotal + 30;
    const maxWake = sleepTotal + 14 * 60;
    setWakeTotal(Math.max(minWake, Math.min(maxWake, newWake)));
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const sleepH = Math.floor(sleepTotal / 60) % 24;
      const sleepM = sleepTotal % 60;
      // Wake total > 24*60 means next day
      const wakeH  = Math.floor(wakeTotal / 60) % 24;
      const wakeM  = wakeTotal % 60;
      await repo.logSleepBlocks(dateRef.current, sleepH, sleepM, wakeH, wakeM);
      onSavedRef.current();
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  };

  const qColor = qualityColor(durMins);
  const currentPreset = DURATION_PRESETS.find((p) => p * 60 === durMins);

  return (
    <Sheet
      ref={sheetRef}
      title="Log sleep"
      snapPoints={['75%']}
      footer={
        <Button
          label={`Save — ${durLabel(durMins)}`}
          onPress={handleSave}
          loading={saving}
          disabled={!canSave}
        />
      }
    >
      {/* ── Duration presets ─────────────────────────────────────────────── */}
      <View style={styles.presets}>
        {DURATION_PRESETS.map((h) => {
          const active = currentPreset === h;
          return (
            <Pressable
              key={h}
              onPress={() => applyPreset(h)}
              style={({ pressed }) => [
                styles.presetBtn,
                {
                  backgroundColor: active ? colors.text : colors.surface,
                  borderColor: active ? colors.text : colors.hairline,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text variant="smallMedium" color={active ? colors.bg : colors.textSoft}>
                {h}h
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Sleep time ───────────────────────────────────────────────────── */}
      <TimeStepper
        label="Fell asleep"
        totalMinutes={sleepTotal}
        onChange={handleSleepChange}
      />

      {/* ── Wake time ────────────────────────────────────────────────────── */}
      <TimeStepper
        label="Woke up"
        totalMinutes={wakeTotal % (24 * 60)}  // display in 12h format
        onChange={handleWakeChange}
        isNextDay={wakeIsNext}
      />

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <View style={[styles.summary, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
        <Moon size={16} color={qColor} strokeWidth={1.75} />
        <Text variant="h2" style={{ color: qColor }}>{durLabel(durMins)}</Text>
        <Text variant="body" color={colors.textMuted}>{qualityLabel(durMins)}</Text>
        <Text variant="caption" color={colors.textFaint}>
          {fmt(sleepTotal)} → {fmt(wakeTotal % (24 * 60))}{wakeIsNext ? ' (+1 day)' : ''}
        </Text>
      </View>
    </Sheet>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Presets
  presets: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
  },

  // Time stepper
  stepper: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stepperLabel: { letterSpacing: 0.6 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplay: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 28,
    fontWeight: '300' as const,
    letterSpacing: 0.5,
  },
  nextDayBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  fineRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  fineBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },

  // Summary
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
});
