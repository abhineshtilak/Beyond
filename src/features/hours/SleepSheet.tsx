import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Sheet, SheetRef } from '@/components/Sheet';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import { formatHour } from './types';
import * as repo from './repo';

export type SleepSheetRef = {
  present: (date: string, onSaved: () => void) => void;
  dismiss: () => void;
};

function sleepQuality(totalMins: number): string {
  const hrs = totalMins / 60;
  if (hrs < 6) return 'Short sleep 😴';
  if (hrs <= 9) return 'Good sleep 😊';
  return 'Long sleep 🛌';
}

function TimePicker({
  label,
  hour,
  minute,
  onChangeHour,
  onChangeMinute,
}: {
  label: string;
  hour: number;
  minute: number;
  onChangeHour: (h: number) => void;
  onChangeMinute: (m: number) => void;
}) {
  const colors = useColors();
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINUTES = [0, 15, 30, 45];

  return (
    <View style={styles.pickerGroup}>
      <Text variant="caption" color={colors.textMuted} style={styles.pickerLabel}>
        {label.toUpperCase()}
      </Text>
      {/* Hour scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hourScroll}
      >
        {HOURS.map((h) => (
          <Pressable
            key={h}
            onPress={() => onChangeHour(h)}
            style={({ pressed }) => [
              styles.hourChip,
              {
                backgroundColor: hour === h ? colors.text : colors.surface,
                borderColor: hour === h ? 'transparent' : colors.hairline,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              variant="smallMedium"
              color={hour === h ? colors.bg : colors.textSoft}
            >
              {formatHour(h)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {/* Minute row */}
      <View style={styles.minuteRow}>
        {MINUTES.map((m) => (
          <Pressable
            key={m}
            onPress={() => onChangeMinute(m)}
            style={({ pressed }) => [
              styles.minChip,
              {
                backgroundColor: minute === m ? colors.text : colors.surface,
                borderColor: minute === m ? 'transparent' : colors.hairline,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              variant="smallMedium"
              color={minute === m ? colors.bg : colors.textSoft}
            >
              :{m.toString().padStart(2, '0')}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const SleepSheet = forwardRef<SleepSheetRef>(function SleepSheet(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const colors = useColors();
  const dateRef = useRef('');
  const onSavedRef = useRef<() => void>(() => {});

  const [sleepHour, setSleepHour] = useState(23);
  const [sleepMin, setSleepMin] = useState(0);
  const [wakeHour, setWakeHour] = useState(7);
  const [wakeMin, setWakeMin] = useState(0);
  const [saving, setSaving] = useState(false);

  const present = useCallback((date: string, onSaved: () => void) => {
    dateRef.current = date;
    onSavedRef.current = onSaved;
    sheetRef.current?.present();
  }, []);

  useImperativeHandle(ref, () => ({
    present,
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  // Duration calculation (cross-midnight aware)
  const sleepTotal = sleepHour * 60 + sleepMin;
  let wakeTotal = wakeHour * 60 + wakeMin;
  if (wakeTotal <= sleepTotal) wakeTotal += 24 * 60;
  const durMins = wakeTotal - sleepTotal;
  const quality = sleepQuality(durMins);

  const handleSave = async () => {
    setSaving(true);
    try {
      await repo.logSleepBlocks(
        dateRef.current,
        sleepHour, sleepMin,
        wakeHour, wakeMin,
      );
      onSavedRef.current();
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  };

  const hours = Math.floor(durMins / 60);
  const mins = durMins % 60;
  const durLabel = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

  return (
    <Sheet
      ref={sheetRef}
      title="Log sleep"
      subtitle="When did you sleep last night?"
      snapPoints={['80%']}
      footer={<Button label={`Log ${durLabel} of sleep`} onPress={handleSave} loading={saving} />}
    >
      {/* Quality pill */}
      <View style={[styles.qualityPill, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
        <Text variant="bodyMedium">{quality}</Text>
        <Text variant="body" color={colors.textSoft}>{durLabel}</Text>
      </View>

      <TimePicker
        label="Fell asleep"
        hour={sleepHour}
        minute={sleepMin}
        onChangeHour={setSleepHour}
        onChangeMinute={setSleepMin}
      />
      <TimePicker
        label="Woke up"
        hour={wakeHour}
        minute={wakeMin}
        onChangeHour={setWakeHour}
        onChangeMinute={setWakeMin}
      />
    </Sheet>
  );
});

const styles = StyleSheet.create({
  qualityPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  pickerGroup: { gap: spacing.sm },
  pickerLabel: {},
  hourScroll: { gap: spacing.sm, paddingBottom: 4 },
  hourChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  minuteRow: { flexDirection: 'row', gap: spacing.sm },
  minChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
});
