import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { ChevronDown, Moon, Sunrise } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import {
  calculateSleepDuration,
  formatSleepDuration,
  formatSleepTime,
  isOvernightSleep,
  validateSleepEntry,
} from './sleepMath';
import type { SleepEntryInput } from './types';

type Props = {
  initialValue: SleepEntryInput;
  onConfirm: (input: SleepEntryInput) => void | Promise<void>;
  saving?: boolean;
  submitLabel?: string;
};

type TimeFieldProps = {
  label: string;
  icon: React.ReactNode;
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
};

function timeDate(hour: number, minute: number): Date {
  return new Date(2000, 0, 1, hour, minute, 0, 0);
}

function NativeTimeField({
  label,
  icon,
  hour,
  minute,
  onChange,
}: TimeFieldProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const value = timeDate(hour, minute);

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'time',
        display: 'default',
        is24Hour: false,
        minuteInterval: 5,
        onValueChange: (_event, nextValue) => {
          onChange(nextValue.getHours(), nextValue.getMinutes());
        },
      });
      return;
    }
    setExpanded((current) => !current);
  };

  return (
    <View style={styles.fieldGroup}>
      <Text
        variant="caption"
        color={colors.textMuted}
        style={styles.fieldLabel}
      >
        {label}
      </Text>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.timeField,
          {
            backgroundColor: colors.surface,
            borderColor: expanded ? colors.textSoft : colors.hairline,
          },
          pressed && { opacity: 0.75 },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
          {icon}
        </View>
        <Text style={[styles.timeValue, { color: colors.text }]}>
          {formatSleepTime(hour, minute)}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} strokeWidth={1.75} />
      </Pressable>

      {Platform.OS !== 'android' && expanded ? (
        <View
          style={[
            styles.inlinePicker,
            { backgroundColor: colors.surface, borderColor: colors.hairline },
          ]}
        >
          <DateTimePicker
            value={value}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minuteInterval={5}
            onValueChange={(_event, nextValue) => {
              onChange(nextValue.getHours(), nextValue.getMinutes());
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

export function SleepPicker({
  initialValue,
  onConfirm,
  saving = false,
  submitLabel = 'Save sleep',
}: Props) {
  const colors = useColors();
  const [value, setValue] = useState<SleepEntryInput>(initialValue);
  const durationMins = useMemo(() => calculateSleepDuration(value), [value]);
  const validationError = useMemo(() => validateSleepEntry(value), [value]);
  const overnight = useMemo(() => isOvernightSleep(value), [value]);

  return (
    <View style={styles.container}>
      <NativeTimeField
        label="Sleep Time"
        icon={<Moon size={18} color={colors.lavender} strokeWidth={1.75} />}
        hour={value.sleepHour}
        minute={value.sleepMinute}
        onChange={(sleepHour, sleepMinute) => {
          setValue((current) => ({ ...current, sleepHour, sleepMinute }));
        }}
      />

      <NativeTimeField
        label="Wake Time"
        icon={<Sunrise size={18} color={colors.accent} strokeWidth={1.75} />}
        hour={value.wakeHour}
        minute={value.wakeMinute}
        onChange={(wakeHour, wakeMinute) => {
          setValue((current) => ({ ...current, wakeHour, wakeMinute }));
        }}
      />

      <View
        style={[
          styles.summary,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline },
        ]}
      >
        <View style={styles.summaryTop}>
          <View>
            <Text variant="caption" color={colors.textMuted}>
              DURATION
            </Text>
            <Text variant="h2" style={styles.duration}>
              {formatSleepDuration(durationMins)}
            </Text>
          </View>
          {overnight ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.lavenderSoft },
              ]}
            >
              <Text variant="caption" color={colors.lavender}>
                Previous evening
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="small" color={colors.textMuted}>
          {formatSleepTime(value.sleepHour, value.sleepMinute)}
          {' to '}
          {formatSleepTime(value.wakeHour, value.wakeMinute)}
        </Text>
        {validationError ? (
          <Text variant="small" color="#B97A6B">
            {validationError}
          </Text>
        ) : null}
      </View>

      <Button
        label={submitLabel}
        onPress={() => onConfirm(value)}
        loading={saving}
        disabled={!!validationError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timeField: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: {
    flex: 1,
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  inlinePicker: {
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    alignItems: 'center',
  },
  summary: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  duration: {
    marginTop: 2,
  },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
