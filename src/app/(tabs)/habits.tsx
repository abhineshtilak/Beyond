import React, { useRef } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { colors, spacing } from '@/theme';
import { prettyDate } from '@/lib/date';
import { confirm } from '@/lib/confirm';
import { useHabitsStore } from '@/features/habits/store';
import { HabitRow } from '@/features/habits/HabitRow';
import { HabitEditor, HabitEditorRef } from '@/features/habits/HabitEditor';

export default function HabitsScreen() {
  const habits = useHabitsStore((s) => s.habits);
  const refresh = useHabitsStore((s) => s.refresh);
  const toggle = useHabitsStore((s) => s.toggleToday);
  const remove = useHabitsStore((s) => s.remove);
  const editorRef = useRef<HabitEditorRef>(null);
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Delete habit',
      message: `Remove "${title}" and all its history?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) await remove(id);
  };

  const doneCount = habits.filter((h) => h.doneToday).length;

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>{prettyDate()}</Text>
            <Text variant="display" style={{ marginTop: 4 }}>Habits</Text>
            {habits.length > 0 ? (
              <Text variant="body" color={colors.textSoft} style={{ marginTop: spacing.xs }}>
                {doneCount} of {habits.length} done today
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <HabitRow
              habit={item}
              onToggle={() => toggle(item.id)}
              onPress={() => router.push({ pathname: '/habit/[id]', params: { id: item.id } })}
              onDelete={() => handleDelete(item.id, item.title)}
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
      <Fab onPress={() => editorRef.current?.present()} />
      <HabitEditor ref={editorRef} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xl, paddingBottom: 160 },
  header: { marginBottom: spacing.lg },
  rowWrap: { marginBottom: spacing.md },
});
