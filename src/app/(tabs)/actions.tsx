import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CheckCircle2, Sparkles, Trash2, X, CheckSquare } from 'lucide-react-native';
import * as Haptics from '@/lib/haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { spacing, radii, useColors } from '@/theme';
import { prettyDate } from '@/lib/date';
import { confirm } from '@/lib/confirm';

import { useHabitsStore } from '@/features/habits/store';
import { HabitRow } from '@/features/habits/HabitRow';
import { HabitEditor, HabitEditorRef } from '@/features/habits/HabitEditor';
import { StreakSaverSheet, StreakSaverSheetRef } from '@/features/habits/StreakSaverSheet';
import { isStreakAtRisk } from '@/features/habits/repo';

import { useTasksStore, selectFiltered, TaskFilter } from '@/features/tasks/store';
import { TaskRow } from '@/features/tasks/TaskRow';
import { TaskEditor, TaskEditorRef } from '@/features/tasks/TaskEditor';

type ActiveTab = 'habits' | 'tasks';

const TASK_FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Soon' },
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Done' },
];

export default function ActionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('habits');

  // ─── Habits state ───────────────────────────────────────────────
  const habits = useHabitsStore((s) => s.habits);
  const refreshHabits = useHabitsStore((s) => s.refresh);
  const toggleHabit = useHabitsStore((s) => s.toggleToday);
  const removeHabit = useHabitsStore((s) => s.remove);
  const habitEditorRef = useRef<HabitEditorRef>(null);
  const streakSaverRef = useRef<StreakSaverSheetRef>(null);

  // ─── Tasks state ────────────────────────────────────────────────
  const tasks = useTasksStore((s) => s.tasks);
  const taskFilter = useTasksStore((s) => s.filter);
  const setTaskFilter = useTasksStore((s) => s.setFilter);
  const refreshTasks = useTasksStore((s) => s.refresh);
  const toggleTask = useTasksStore((s) => s.toggleComplete);
  const removeTask = useTasksStore((s) => s.remove);
  const removeTasksMany = useTasksStore((s) => s.removeMany);
  const completeTasksMany = useTasksStore((s) => s.completeMany);
  const taskEditorRef = useRef<TaskEditorRef>(null);

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const taskSelectionMode = selectedTasks.size > 0;

  useFocusEffect(
    useCallback(() => {
      refreshHabits().then(() => {
        const fresh = useHabitsStore.getState().habits;
        const atRisk = fresh.filter((h) => h.streak > 0 && isStreakAtRisk(h.doneDates));
        if (atRisk.length > 0) {
          const first = atRisk[0];
          setTimeout(() => {
            streakSaverRef.current?.present(
              first.id,
              first.title,
              first.streak,
              first.streakCredits,
              () => refreshHabits(),
            );
          }, 600);
        }
      });
      refreshTasks();
    }, [refreshHabits, refreshTasks]),
  );

  const filteredTasks = useMemo(() => selectFiltered(tasks, taskFilter), [tasks, taskFilter]);
  const doneHabits = habits.filter((h) => h.doneToday).length;

  // ─── Task selection helpers ──────────────────────────────────────
  const exitTaskSelection = useCallback(() => setSelectedTasks(new Set()), []);
  const enterTaskSelection = useCallback((id: string) => setSelectedTasks(new Set([id])), []);
  const toggleTaskSelect = useCallback((id: string) => {
    setSelectedTasks((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const selectAllTasks = () => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedTasks(new Set(filteredTasks.map((t) => t.id)));
  };
  const handleBulkDeleteTasks = async () => {
    if (selectedTasks.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedTasks.size} task${selectedTasks.size === 1 ? '' : 's'}?`,
      message: "This can't be undone.",
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await removeTasksMany(Array.from(selectedTasks));
    exitTaskSelection();
  };
  const handleBulkCompleteTasks = async () => {
    if (selectedTasks.size === 0) return;
    await completeTasksMany(Array.from(selectedTasks));
    exitTaskSelection();
  };
  const handleSingleDeleteTask = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Delete task',
      message: `Remove "${title}"? This can't be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) await removeTask(id);
  };
  const handleDeleteHabit = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Delete habit',
      message: `Remove "${title}" and all its history?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) await removeHabit(id);
  };

  // ─── Segmented control ──────────────────────────────────────────
  const SegmentedControl = (
    <View style={[styles.segmentWrap, { backgroundColor: colors.surfaceAlt }]}>
      {(['habits', 'tasks'] as ActiveTab[]).map((tab) => {
        const active = activeTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setActiveTab(tab);
            }}
            style={[
              styles.segment,
              active && { backgroundColor: colors.surface, ...shadowSegment },
            ]}
          >
            <Text
              variant="smallMedium"
              color={active ? colors.text : colors.textMuted}
              style={active ? styles.segLabelActive : styles.segLabel}
            >
              {tab === 'habits' ? `Habits${habits.length > 0 ? `  ${doneHabits}/${habits.length}` : ''}` : 'Tasks'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // ─── Habits list ─────────────────────────────────────────────────
  const HabitsList = (
    <FlatList
      data={habits}
      keyExtractor={(h) => h.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text variant="caption" color={colors.textMuted} style={styles.dateLabel}>
            {prettyDate()}
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>Actions</Text>
          <View style={{ marginTop: spacing.xl }}>{SegmentedControl}</View>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.rowWrap}>
          <HabitRow
            habit={item}
            onToggle={() => toggleHabit(item.id)}
            onPress={() => router.push({ pathname: '/habit/[id]', params: { id: item.id } })}
            onDelete={() => handleDeleteHabit(item.id, item.title)}
          />
        </View>
      )}
      ListEmptyComponent={
        <EmptyState
          icon={Sparkles}
          title="Start small"
          message="One gentle habit. Show up tomorrow. That's how lives change."
        />
      }
    />
  );

  // ─── Tasks list header (normal + selection mode) ──────────────────
  const TasksListHeader = () => {
    if (taskSelectionMode) {
      return (
        <View style={styles.header}>
          <View style={styles.selHeader}>
            <Pressable
              onPress={exitTaskSelection}
              hitSlop={10}
              style={[styles.selIconBtn, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
            >
              <X size={20} color={colors.text} strokeWidth={2} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>Selection</Text>
              <Text variant="h2" style={{ marginTop: 2 }}>
                {selectedTasks.size} task{selectedTasks.size === 1 ? '' : 's'}
              </Text>
            </View>
            <Pressable
              onPress={selectAllTasks}
              hitSlop={10}
              style={[styles.selPill, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
            >
              <Text variant="smallMedium" color={colors.textSoft}>
                {selectedTasks.size === filteredTasks.length && filteredTasks.length > 0 ? 'NONE' : 'ALL'}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.header}>
        <Text variant="caption" color={colors.textMuted} style={styles.dateLabel}>
          {prettyDate()}
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>Actions</Text>
        <View style={{ marginTop: spacing.xl }}>{SegmentedControl}</View>
        <View style={styles.taskFilters}>
          {TASK_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setTaskFilter(f.key)}
              style={[
                styles.filterChip,
                taskFilter === f.key
                  ? { backgroundColor: colors.text }
                  : { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline },
              ]}
            >
              <Text
                variant="caption"
                color={taskFilter === f.key ? colors.bg : colors.textSoft}
                style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text variant="small" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Press and hold a task to select multiple.
        </Text>
      </View>
    );
  };

  const TasksList = (
    <FlatList
      data={filteredTasks}
      keyExtractor={(t) => t.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={<TasksListHeader />}
      renderItem={({ item }) => (
        <View style={styles.rowWrap}>
          <TaskRow
            task={item}
            onToggle={() => toggleTask(item.id)}
            onPress={() => taskEditorRef.current?.present(item)}
            onDelete={() => handleSingleDeleteTask(item.id, item.title)}
            selectionMode={taskSelectionMode}
            selected={selectedTasks.has(item.id)}
            onLongPress={() => enterTaskSelection(item.id)}
            onSelect={() => toggleTaskSelect(item.id)}
          />
        </View>
      )}
      ListEmptyComponent={
        <EmptyState
          icon={CheckCircle2}
          title="Nothing on your plate"
          message={
            taskFilter === 'completed'
              ? 'Completed tasks will appear here.'
              : 'A clear list is a kind of peace. Add a task when you\'re ready.'
          }
        />
      }
    />
  );

  return (
    <Screen scroll={false} padded={false}>
      {activeTab === 'habits' ? HabitsList : TasksList}

      {/* FAB */}
      {activeTab === 'habits' && (
        <Fab onPress={() => habitEditorRef.current?.present()} />
      )}
      {activeTab === 'tasks' && !taskSelectionMode && (
        <Fab onPress={() => taskEditorRef.current?.present()} />
      )}

      {/* Task bulk-action bar */}
      {activeTab === 'tasks' && taskSelectionMode && (
        <View
          style={[styles.actionBar, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={handleBulkCompleteTasks}
            style={({ pressed }) => [
              styles.barBtn,
              { backgroundColor: colors.bg, borderColor: colors.hairline },
              pressed && { opacity: 0.8 },
            ]}
          >
            <CheckSquare size={18} color={colors.text} strokeWidth={1.8} />
            <Text variant="smallMedium">Complete</Text>
          </Pressable>
          <Pressable
            onPress={handleBulkDeleteTasks}
            style={({ pressed }) => [
              styles.barBtn,
              styles.barDanger,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Trash2 size={18} color="#fff" strokeWidth={1.8} />
            <Text variant="smallMedium" color="#fff">Delete</Text>
          </Pressable>
        </View>
      )}

      <HabitEditor ref={habitEditorRef} />
      <TaskEditor ref={taskEditorRef} />
      <StreakSaverSheet ref={streakSaverRef} />
    </Screen>
  );
}

const shadowSegment = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: 200,
  },
  header: { marginBottom: spacing.lg },
  dateLabel: { textTransform: 'uppercase' },
  rowWrap: { marginBottom: spacing.md },

  // Segmented control
  segmentWrap: {
    flexDirection: 'row',
    borderRadius: radii.xl,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segLabel: { letterSpacing: 0.2 },
  segLabelActive: { letterSpacing: 0.2 },

  // Task filters
  taskFilters: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },

  // Task selection
  selHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selIconBtn: {
    width: 40, height: 40, borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  selPill: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radii.pill, borderWidth: 1,
  },

  // Bulk action bar
  actionBar: {
    position: 'absolute',
    left: spacing.lg, right: spacing.lg, bottom: 110,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xxl,
    borderWidth: 1,
  },
  barBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  barDanger: {
    backgroundColor: '#C97B6E',
    borderColor: '#C97B6E',
  },
});
