import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Calendar as CalIcon, Flag, Tag, Trash2, Target, Bell } from 'lucide-react-native';
import { GoalPicker } from '@/features/goals/GoalPicker';
import { ReminderPicker } from '@/components/ReminderPicker';
import { Sheet, SheetRef } from '@/components/Sheet';
import { SheetInput as Input } from '@/components/SheetInput';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { InlineCalendar } from '@/components/InlineCalendar';
import { colors, spacing, radii } from '@/theme';
import { confirm } from '@/lib/confirm';
import { useTasksStore } from './store';
import { CATEGORY_META, PRIORITY_META } from './types';
import type { Task, TaskCategory, TaskInput, TaskPriority } from './types';

export type TaskEditorRef = {
  present: (task?: Task) => void;
  dismiss: () => void;
};

export const TaskEditor = forwardRef<TaskEditorRef>(function TaskEditor(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [priority, setPriority] = useState<TaskPriority>(2);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);

  const create = useTasksStore((s) => s.create);
  const update = useTasksStore((s) => s.update);
  const remove = useTasksStore((s) => s.remove);

  const reset = useCallback((t?: Task) => {
    setEditing(t ?? null);
    setTitle(t?.title ?? '');
    setNotes(t?.notes ?? '');
    setCategory(t?.category ?? null);
    setPriority(t?.priority ?? 2);
    setDueDate(t?.dueDate ?? null);
    setGoalId(t?.goalId ?? null);
    setReminderTime(t?.reminderTime ?? null);
    setShowCalendar(false);
  }, []);

  useImperativeHandle(ref, () => ({
    present: (task) => {
      reset(task);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const input: TaskInput = {
        title: title.trim(),
        notes: notes.trim() || null,
        category,
        priority,
        dueDate,
        goalId,
        reminderTime: dueDate ? reminderTime : null,
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
      title: 'Delete task',
      message: `Remove "${editing.title}"?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await remove(editing.id);
    sheetRef.current?.dismiss();
  };

  return (
    <Sheet
      ref={sheetRef}
      title={editing ? 'Edit task' : 'New task'}
      snapPoints={['85%']}
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
      footer={
        <Button label={editing ? 'Save changes' : 'Add task'} onPress={handleSave} loading={saving} disabled={!title.trim()} />
      }
    >
      <Input
        label="Title"
        placeholder="What needs doing?"
        value={title}
        onChangeText={setTitle}
        autoFocus={!editing}
      />
      <Input
        label="Notes (optional)"
        placeholder="Any details..."
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Tag size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Category</Text>
        </View>
        <View style={styles.chipRow}>
          {(Object.keys(CATEGORY_META) as TaskCategory[]).map((key) => {
            const meta = CATEGORY_META[key];
            const selected = category === key;
            return (
              <Chip
                key={key}
                label={meta.label}
                selected={selected}
                tint={meta.tint}
                onPress={() => setCategory(selected ? null : key)}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Flag size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Priority</Text>
        </View>
        <View style={styles.chipRow}>
          {([1, 2, 3] as TaskPriority[]).map((p) => {
            const meta = PRIORITY_META[p];
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
          <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Due date</Text>
        </View>
        <Pressable onPress={() => setShowCalendar((v) => !v)}>
          <View style={styles.dateRow}>
            <Text variant="body" color={dueDate ? colors.text : colors.textMuted}>
              {dueDate ? format(parseISO(dueDate), 'EEEE, MMMM d') : 'No date set'}
            </Text>
            {dueDate ? (
              <Pressable onPress={() => setDueDate(null)} hitSlop={8}>
                <Text variant="smallMedium" color={colors.textMuted}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
        {showCalendar ? (
          <View style={{ marginTop: spacing.sm }}>
            <InlineCalendar selected={dueDate} onSelect={(d) => { setDueDate(d); setShowCalendar(false); }} />
          </View>
        ) : null}
      </View>

      {dueDate ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={14} color={colors.textMuted} strokeWidth={1.75} />
            <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Reminder</Text>
          </View>
          <ReminderPicker
            time={reminderTime}
            onTimeChange={setReminderTime}
            showDays={false}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Target size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>Linked goal</Text>
        </View>
        <GoalPicker value={goalId} onChange={setGoalId} />
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
  headerTrash: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
