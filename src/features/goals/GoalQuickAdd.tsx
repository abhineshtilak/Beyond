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
  type GoalCategory,
  type GoalPriority,
} from './types';

export type GoalQuickAddRef = {
  present: (onCreated?: (id: string) => void) => void;
  dismiss: () => void;
};

export const GoalQuickAdd = forwardRef<GoalQuickAddRef>(function GoalQuickAdd(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const create = useGoalsStore((s) => s.create);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory | null>(null);
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [priority, setPriority] = useState<GoalPriority>(2);
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);
  const onCreatedRef = useRef<((id: string) => void) | null>(null);

  const reset = useCallback(() => {
    setTitle('');
    setCategory(null);
    setTargetDate(null);
    setPriority(2);
    setShowCalendar(false);
  }, []);

  useImperativeHandle(ref, () => ({
    present: (onCreated) => {
      reset();
      onCreatedRef.current = onCreated ?? null;
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const id = await create({ title: title.trim(), category, targetDate, priority });
      sheetRef.current?.dismiss();
      onCreatedRef.current?.(id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      ref={sheetRef}
      title="New goal"
      subtitle="Capture the seed now. You can add depth later."
      snapPoints={['80%']}
      footer={<Button label="Create goal" onPress={handleSave} loading={saving} disabled={!title.trim()} />}
    >
      <Input
        label="What do you want?"
        placeholder="Be specific. e.g. Run a half marathon."
        value={title}
        onChangeText={setTitle}
        autoFocus
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
              minDate={format(new Date(), 'yyyy-MM-dd')}
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
