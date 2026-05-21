import React, { useState } from 'react';
import { View, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Bell, X, Clock } from 'lucide-react-native';
import { Text } from './Text';
import { Chip } from './Chip';
import { colors, radii, spacing } from '@/theme';

type Props = {
  time: string | null;        // "HH:mm"
  days?: number[] | null;     // 0=Sun..6=Sat — undefined means one-time reminder, no day picker
  onTimeChange: (time: string | null) => void;
  onDaysChange?: (days: number[]) => void;
  showDays?: boolean;
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ReminderPicker({
  time,
  days,
  onTimeChange,
  onDaysChange,
  showDays = true,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const enabled = !!time;

  const toggleEnabled = () => {
    if (enabled) {
      onTimeChange(null);
      onDaysChange?.([]);
    } else {
      onTimeChange('09:00');
      if (showDays) onDaysChange?.([1, 2, 3, 4, 5]); // weekdays default
    }
  };

  const handleTimeChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) {
      const h = selected.getHours().toString().padStart(2, '0');
      const m = selected.getMinutes().toString().padStart(2, '0');
      onTimeChange(`${h}:${m}`);
    }
  };

  const toggleDay = (d: number) => {
    const cur = days ?? [];
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort();
    onDaysChange?.(next);
  };

  const pickerValue = (() => {
    if (!time) return new Date();
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  })();

  const presets = [
    { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
    { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
    { label: 'Weekends', days: [0, 6] },
  ];

  const matchesPreset = (preset: number[]) =>
    days?.length === preset.length && days.every((d) => preset.includes(d));

  return (
    <View style={styles.wrap}>
      <Pressable onPress={toggleEnabled} style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.85 }]}>
        <View style={styles.toggleLeft}>
          <Bell size={16} color={enabled ? colors.text : colors.textMuted} strokeWidth={1.75} />
          <Text variant="body" color={enabled ? colors.text : colors.textMuted}>
            {enabled ? 'Reminder is on' : 'No reminder'}
          </Text>
        </View>
        <View style={[styles.toggle, enabled && styles.toggleOn]}>
          <View style={[styles.toggleKnob, enabled && styles.toggleKnobOn]} />
        </View>
      </Pressable>

      {enabled ? (
        <>
          <Pressable onPress={() => setShowPicker(true)} style={styles.timeRow}>
            <Clock size={16} color={colors.textMuted} strokeWidth={1.75} />
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              {time}
            </Text>
            <Text variant="smallMedium" color={colors.textMuted}>CHANGE</Text>
          </Pressable>

          {showDays && onDaysChange ? (
            <>
              <View style={styles.presetRow}>
                {presets.map((p) => (
                  <Chip
                    key={p.label}
                    label={p.label}
                    selected={matchesPreset(p.days)}
                    size="sm"
                    onPress={() => onDaysChange(p.days)}
                  />
                ))}
              </View>
              <View style={styles.daysRow}>
                {DAY_LABELS.map((lbl, i) => {
                  const selected = days?.includes(i);
                  return (
                    <Pressable
                      key={i}
                      onPress={() => toggleDay(i)}
                      style={[styles.dayBtn, selected && styles.dayBtnOn]}
                    >
                      <Text
                        variant="smallMedium"
                        color={selected ? colors.bg : colors.text}
                      >
                        {lbl}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {showPicker ? (
            <DateTimePicker
              value={pickerValue}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: 14,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.hairline,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: colors.text },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
  toggleKnobOn: { transform: [{ translateX: 18 }] },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: 14,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  dayBtn: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtnOn: { backgroundColor: colors.text, borderColor: colors.text },
});
