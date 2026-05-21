import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Calendar as CalIcon, Flag, Tag } from 'lucide-react-native';
import { Sheet, SheetRef } from '@/components/Sheet';
import { SheetInput as Input } from '@/components/SheetInput';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { InlineCalendar } from '@/components/InlineCalendar';
import { colors, spacing } from '@/theme';
import { useGoalsStore } from './store';
import {
  GOAL_CATEGORY_META,
  GOAL_PRIORITY_META,
  type Goal,
  type GoalCategory,
  type GoalPriority,
} from './types';

export type GoalBasicsEditorRef = {
  present: (goal: Goal) => void;
  dismiss: () => void;
};

type Props = { onSaved?: () => void };

export const GoalBasicsEditor = forwardRef<GoalBasicsEditorRef, Props>(function GoalBasicsEditor({ onSaved }, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const update = useGoalsStore((s) => s.update);

  const [goalId, setGoalId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory | null>(null);
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [priority, setPriority] = useState<GoalPriority>(2);
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);

  const hydrate = useCallback((g: Goal) => {
    setGoalId(g.id);
    setTitle(g.title);
    setCategory(g.category);
    setTargetDate(g.targetDate);
    setPriority(g.priority);
    setShowCalendar(false);
  }, []);

  useImperativeHandle(ref, () => ({
    present: (goal) => {
      hydrate(goal);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    if (!goalId || !title.trim()) return;
    setSaving(true);
    try {
      await update(goalId, { title: title.trim(), category, targetDate, priority });
      sheetRef.current?.dismiss();
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      ref={sheetRef}
      title="Edit goal"
      snapPoints={['85%']}
      footer={<Button label="Save changes" onPress={handleSave} loading={saving} disabled={!title.trim()} />}
    >
      <Input
        label="Title"
        placeholder="What do you want?"
        value={title}
        onChangeText={setTitle}
      />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Tag size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Category</Text>
        </View>
        <View style={styles.chipRow}>
          {(Object.keys(GOAL_CATEGORY_META) as GoalCategory[]).map((key) => {
            const meta = GOAL_CATEGORY_META[key];
            const selected = category === key;
            return (
              <Chip
                key={key}
                label={meta.label}
                selected={selected}
                tint={meta.tint}
                onPress={() => setCategory(selected ? null : key)}
                size="sm"
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Flag size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Urgency</Text>
        </View>
        <View style={styles.chipRow}>
          {([1, 2, 3] as GoalPriority[]).map((p) => {
            const meta = GOAL_PRIORITY_META[p];
            return (
              <Chip
                key={p}
                label={meta.label}
                selected={priority === p}
                tint={meta.tint}
                onPress={() => setPriority(p)}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <CalIcon size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Target date</Text>
        </View>
        <Pressable onPress={() => setShowCalendar((v) => !v)}>
          <View style={styles.dateRow}>
            <Text variant="body" color={targetDate ? colors.text : colors.textMuted}>
              {targetDate ? format(parseISO(targetDate), 'EEEE, MMMM d, yyyy') : 'No deadline set'}
            </Text>
            {targetDate ? (
              <Pressable onPress={() => setTargetDate(null)} hitSlop={8}>
                <Text variant="smallMedium" color={colors.textMuted}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
        {showCalendar ? (
          <View style={{ marginTop: spacing.sm }}>
            <InlineCalendar
              selected={targetDate}
              onSelect={(d) => { setTargetDate(d); setShowCalendar(false); }}
            />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
