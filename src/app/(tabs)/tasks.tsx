import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CheckCircle2, Trash2, X, CheckSquare } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { colors, spacing, radii } from '@/theme';
import { prettyDate } from '@/lib/date';
import { confirm } from '@/lib/confirm';
import { useTasksStore, selectFiltered, TaskFilter } from '@/features/tasks/store';
import { TaskRow } from '@/features/tasks/TaskRow';
import { TaskEditor, TaskEditorRef } from '@/features/tasks/TaskEditor';

const FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Done' },
];

export default function TasksScreen() {
  const tasks = useTasksStore((s) => s.tasks);
  const filter = useTasksStore((s) => s.filter);
  const setFilter = useTasksStore((s) => s.setFilter);
  const refresh = useTasksStore((s) => s.refresh);
  const toggleComplete = useTasksStore((s) => s.toggleComplete);
  const remove = useTasksStore((s) => s.remove);
  const removeMany = useTasksStore((s) => s.removeMany);
  const completeMany = useTasksStore((s) => s.completeMany);

  const editorRef = useRef<TaskEditorRef>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionMode = selected.size > 0;

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => selectFiltered(tasks, filter), [tasks, filter]);

  const exitSelection = useCallback(() => setSelected(new Set()), []);

  const enterSelection = useCallback((id: string) => {
    setSelected(new Set([id]));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => {
    Haptics.selectionAsync().catch(() => {});
    setSelected(new Set(filtered.map((t) => t.id)));
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selected.size} task${selected.size === 1 ? '' : 's'}?`,
      message: "This can't be undone.",
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await removeMany(Array.from(selected));
    exitSelection();
  };

  const handleBulkComplete = async () => {
    if (selected.size === 0) return;
    await completeMany(Array.from(selected));
    exitSelection();
  };

  const handleSingleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Delete task',
      message: `Remove "${title}"? This can't be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) await remove(id);
  };

  const renderHeader = () => {
    if (selectionMode) {
      return (
        <View style={styles.selHeader}>
          <Pressable onPress={exitSelection} hitSlop={10} style={styles.selIconBtn}>
            <X size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Selection
            </Text>
            <Text variant="h2" style={{ marginTop: 2 }}>
              {selected.size} task{selected.size === 1 ? '' : 's'}
            </Text>
          </View>
          <Pressable onPress={selectAll} hitSlop={10} style={styles.selPill}>
            <Text variant="smallMedium" color={colors.textSoft}>
              {selected.size === filtered.length && filtered.length > 0 ? 'NONE' : 'ALL'}
            </Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.header}>
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
          {prettyDate()}
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>Tasks</Text>
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              selected={filter === f.key}
              size="sm"
              onPress={() => setFilter(f.key)}
            />
          ))}
        </View>
        <Text variant="small" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Press and hold a task to select multiple.
        </Text>
      </View>
    );
  };

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <TaskRow
              task={item}
              onToggle={() => toggleComplete(item.id)}
              onPress={() => editorRef.current?.present(item)}
              onDelete={() => handleSingleDelete(item.id, item.title)}
              selectionMode={selectionMode}
              selected={selected.has(item.id)}
              onLongPress={() => enterSelection(item.id)}
              onSelect={() => toggleSelect(item.id)}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={CheckCircle2}
            title="Nothing on your plate"
            message={
              filter === 'completed'
                ? 'Completed tasks will appear here.'
                : 'A clear list is a kind of peace. Add a task when you’re ready.'
            }
          />
        }
      />

      {selectionMode ? (
        <View style={styles.actionBar} pointerEvents="box-none">
          <Pressable onPress={handleBulkComplete} style={({ pressed }) => [styles.barBtn, pressed && { opacity: 0.8 }]}>
            <CheckSquare size={18} color={colors.text} strokeWidth={1.8} />
            <Text variant="smallMedium">Complete</Text>
          </Pressable>
          <Pressable onPress={handleBulkDelete} style={({ pressed }) => [styles.barBtn, styles.barDanger, pressed && { opacity: 0.8 }]}>
            <Trash2 size={18} color={colors.bg} strokeWidth={1.8} />
            <Text variant="smallMedium" color={colors.bg}>Delete</Text>
          </Pressable>
        </View>
      ) : (
        <Fab onPress={() => editorRef.current?.present()} />
      )}
      <TaskEditor ref={editorRef} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: 200,
  },
  header: { marginBottom: spacing.lg, gap: spacing.lg },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  rowWrap: { marginBottom: spacing.md },
  selHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  selIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  actionBar: {
    position: 'absolute',
    left: spacing.lg, right: spacing.lg, bottom: 110,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  barBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  barDanger: {
    backgroundColor: '#C97B6E',
    borderColor: '#C97B6E',
  },
});
