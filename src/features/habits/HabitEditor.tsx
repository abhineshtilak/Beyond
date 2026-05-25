import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Trash2, Target, Bell } from 'lucide-react-native';
import { GoalPicker } from '@/features/goals/GoalPicker';
import { ReminderPicker } from '@/components/ReminderPicker';
import { parseReminderDays } from './types';
import { Sheet, SheetRef } from '@/components/Sheet';
import { SheetInput as Input } from '@/components/SheetInput';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { colors, radii, spacing } from '@/theme';
import { confirm } from '@/lib/confirm';
import { useHabitsStore } from './store';
import { useInputRef } from '@/lib/useInputRef';
import { HABIT_ICONS } from './icons';
import { HABIT_COLORS, HABIT_ICON_KEYS, TIMELINE_PRESETS } from './types';
import type { Habit, HabitInput, HabitIconKey } from './types';

const DURATION_OPTIONS = [
  { label: 'None', mins: 0 },
  { label: '30m', mins: 30 },
  { label: '1h', mins: 60 },
  { label: '1.5h', mins: 90 },
  { label: '2h', mins: 120 },
  { label: '3h', mins: 180 },
];

export type HabitEditorRef = {
  present: (habit?: Habit) => void;
  dismiss: () => void;
};

export const HabitEditor = forwardRef<HabitEditorRef>(function HabitEditor(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const [editing, setEditing] = useState<Habit | null>(null);
  const {
    valueRef: titleRef,
    snapshot: titleSnapshot,
    hasContent: hasTitle,
    onChangeText: onTitleChange,
    reset: resetTitle,
  } = useInputRef('');
  const [icon, setIcon] = useState<HabitIconKey>('sparkles');
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [targetDays, setTargetDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState('');
  const [durationMins, setDurationMins] = useState(0);
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [reminderTime, setReminderTime] = useState<string | null>(null);
  const [reminderDays, setReminderDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const create = useHabitsStore((s) => s.create);
  const update = useHabitsStore((s) => s.update);
  const remove = useHabitsStore((s) => s.remove);

  const reset = useCallback((h?: Habit) => {
    setEditing(h ?? null);
    resetTitle(h?.title ?? '');
    setIcon(h?.icon ?? 'sparkles');
    setColor(h?.color ?? HABIT_COLORS[0]);
    setTargetDays(h?.targetDays ?? 30);
    const presetMatch = TIMELINE_PRESETS.some((p) => p.days === (h?.targetDays ?? 30));
    setCustomDays(presetMatch ? '' : String(h?.targetDays ?? ''));
    setDurationMins(h?.durationMins ?? 0);
    setGoalIds(h?.goalIds ?? (h?.goalId ? [h.goalId] : []));
    setReminderTime(h?.reminderTime ?? null);
    setReminderDays(parseReminderDays(h?.reminderDays ?? null));
  }, [resetTitle]);

  useImperativeHandle(ref, () => ({
    present: (habit) => {
      reset(habit);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    if (!titleRef.current.trim()) return;
    setSaving(true);
    try {
      const input: HabitInput = {
        title: titleRef.current.trim(), icon, color, targetDays, goalIds,
        reminderTime, reminderDays, durationMins,
      };
      if (editing) await update(editing.id, input);
      else await create(input);
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    const ok = await confirm({
      title: 'Delete habit',
      message: `Remove "${editing.title}" and all its history?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await remove(editing.id);
    sheetRef.current?.dismiss();
  };

  const onCustomDays = (raw: string) => {
    const clean = raw.replace(/[^0-9]/g, '').slice(0, 4);
    setCustomDays(clean);
    const n = parseInt(clean, 10);
    if (!isNaN(n) && n > 0) setTargetDays(n);
  };

  const isCustom = !TIMELINE_PRESETS.some((p) => p.days === targetDays);

  return (
    <Sheet
      ref={sheetRef}
      title={editing ? 'Edit habit' : 'New habit'}
      snapPoints={['92%']}
      headerRight={
        editing ? (
          <Pressable
            onPress={handleDelete}
            hitSlop={10}
            style={({ pressed }) => [
              styles.headerTrash,
              { backgroundColor: '#F7E9E5' },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Trash2 size={16} color="#B97A6B" strokeWidth={1.75} />
          </Pressable>
        ) : null
      }
      footer={<Button label={editing ? 'Save changes' : 'Add habit'} onPress={handleSave} loading={saving} disabled={!hasTitle} />}
    >
      <View style={styles.previewWrap}>
        <View style={[styles.preview, { backgroundColor: color + '33' }]}>
          {(() => {
            const I = HABIT_ICONS[icon];
            return <I size={36} color={color} strokeWidth={1.6} />;
          })()}
        </View>
      </View>

      <Input
        label="Name"
        placeholder="e.g. Meditate, Read, Drink water"
        value={titleSnapshot}
        onChangeText={onTitleChange}
        autoFocus={!editing}
      />

      <View style={styles.section}>
        <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Timeline</Text>
        <Text variant="small" color={colors.textMuted}>How many days do you want to commit to this habit?</Text>
        <View style={styles.chipRow}>
          {TIMELINE_PRESETS.map((p) => (
            <Chip
              key={p.days}
              label={p.label}
              selected={targetDays === p.days}
              onPress={() => { setTargetDays(p.days); setCustomDays(''); }}
            />
          ))}
          <Chip
            label="Custom"
            selected={isCustom && !!customDays}
            onPress={() => setCustomDays(customDays || String(targetDays))}
          />
        </View>
        {(isCustom || customDays) ? (
          <Input
            placeholder="Custom number of days"
            value={customDays}
            onChangeText={onCustomDays}
            keyboardType="numeric"
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Time consumed</Text>
        <Text variant="small" color={colors.textMuted}>
          How long does this habit take? When you log it, those hours will auto-fill in your tracker.
        </Text>
        <View style={styles.chipRow}>
          {DURATION_OPTIONS.map((opt) => (
            <Chip
              key={opt.mins}
              label={opt.label}
              selected={durationMins === opt.mins}
              onPress={() => setDurationMins(opt.mins)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Icon</Text>
        <View style={styles.iconGrid}>
          {HABIT_ICON_KEYS.map((key) => {
            const I = HABIT_ICONS[key];
            const selected = key === icon;
            return (
              <Pressable
                key={key}
                onPress={() => setIcon(key)}
                style={[styles.iconCell, selected && { borderColor: color, backgroundColor: color + '22' }]}
              >
                <I size={22} color={selected ? color : colors.textSoft} strokeWidth={1.8} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Color</Text>
        <View style={styles.colorRow}>
          {HABIT_COLORS.map((c) => {
            const selected = c === color;
            return (
              <Pressable key={c} onPress={() => setColor(c)} style={[styles.swatchOuter, selected && { borderColor: c }]}>
                <View style={[styles.swatch, { backgroundColor: c }]} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Bell size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Reminder</Text>
        </View>
        <ReminderPicker
          time={reminderTime}
          days={reminderDays}
          onTimeChange={setReminderTime}
          onDaysChange={setReminderDays}
          showDays
        />
      </View>

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Target size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Linked goal</Text>
        </View>
        <GoalPicker multi value={goalIds} onChange={setGoalIds} />
      </View>

    </Sheet>
  );
});

const styles = StyleSheet.create({
  previewWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  preview: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: spacing.sm },
  sectionLabel: { textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  swatchOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 4,
  },
  swatch: { flex: 1, borderRadius: 999 },
  headerTrash: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
});
