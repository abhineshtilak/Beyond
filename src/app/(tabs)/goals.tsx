import React, { useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Target } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { colors, spacing } from '@/theme';
import { useGoalsStore } from '@/features/goals/store';
import { GoalCard } from '@/features/goals/GoalCard';
import { GoalQuickAdd, GoalQuickAddRef } from '@/features/goals/GoalQuickAdd';

type Filter = 'active' | 'all' | 'completed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Reached' },
  { key: 'all', label: 'All' },
];

export default function GoalsScreen() {
  const goals = useGoalsStore((s) => s.goals);
  const refresh = useGoalsStore((s) => s.refresh);
  const [filter, setFilter] = useState<Filter>('active');
  const quickAddRef = useRef<GoalQuickAddRef>(null);
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    if (filter === 'active') return goals.filter((g) => g.status === 'active' || g.status === 'paused');
    if (filter === 'completed') return goals.filter((g) => g.status === 'completed');
    return goals;
  }, [goals, filter]);

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={filtered}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              {goals.length} goal{goals.length === 1 ? '' : 's'}
            </Text>
            <Text variant="display" style={{ marginTop: 4 }}>Goals</Text>
            <Text variant="body" color={colors.textSoft} style={{ marginTop: spacing.xs }}>
              Define what you want. Clearly, deeply, with the reasons that move you.
            </Text>
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
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <GoalCard goal={item} onPress={() => router.push({ pathname: '/goal/[id]', params: { id: item.id } })} />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Target}
            title="What do you want?"
            message="Capture one goal that matters. You can add depth — your why, milestones, plan — afterwards."
          />
        }
      />
      <Fab onPress={() => quickAddRef.current?.present((id) => router.push({ pathname: '/goal/[id]', params: { id } }))} />
      <GoalQuickAdd ref={quickAddRef} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: 160,
  },
  header: { marginBottom: spacing.lg, gap: spacing.sm },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  rowWrap: { marginBottom: spacing.lg },
});
