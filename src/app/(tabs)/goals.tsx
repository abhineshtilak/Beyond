import React, { useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Target } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { spacing, useColors } from '@/theme';
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
  const colors = useColors();
  const goals = useGoalsStore((s) => s.goals);
  const refresh = useGoalsStore((s) => s.refresh);
  const [filter, setFilter] = useState<Filter>('active');
  const quickAddRef = useRef<GoalQuickAddRef>(null);
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => { refresh(); }, [refresh]),
  );

  const filtered = useMemo(() => {
    if (filter === 'active') return goals.filter((g) => g.status === 'active' || g.status === 'paused');
    if (filter === 'completed') return goals.filter((g) => g.status === 'completed');
    return goals;
  }, [goals, filter]);

  // Live stats for header
  const activeCount = useMemo(() => goals.filter((g) => g.status === 'active').length, [goals]);
  const reachedCount = useMemo(() => goals.filter((g) => g.status === 'completed').length, [goals]);
  const avgProgress = useMemo(() => {
    const active = goals.filter((g) => g.status === 'active');
    if (active.length === 0) return 0;
    return Math.round(active.reduce((s, g) => s + g.progress, 0) / active.length);
  }, [goals]);

  const hasGoals = goals.length > 0;

  const emptyMessage = (() => {
    if (!hasGoals) return 'Capture one goal that matters. You can add the depth — your why, milestones, plan — once it exists.';
    if (filter === 'completed') return 'No goals reached yet. Keep going.';
    if (filter === 'active') return 'All caught up. Ready for a new challenge?';
    return 'Nothing here yet.';
  })();

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={filtered}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="display">Goals</Text>

            {hasGoals ? (
              <View style={styles.statsRow}>
                {activeCount > 0 ? (
                  <View style={[styles.statPill, { backgroundColor: colors.surfaceAlt }]}>
                    <Text variant="caption" color={colors.textSoft}>
                      {activeCount} active
                    </Text>
                  </View>
                ) : null}
                {reachedCount > 0 ? (
                  <View style={[styles.statPill, { backgroundColor: colors.surfaceAlt }]}>
                    <Text variant="caption" color={colors.textSoft}>
                      {reachedCount} reached
                    </Text>
                  </View>
                ) : null}
                {activeCount > 0 && avgProgress > 0 ? (
                  <View style={[styles.statPill, { backgroundColor: colors.surfaceAlt }]}>
                    <Text variant="caption" color={colors.textSoft}>
                      avg {avgProgress}%
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text variant="body" color={colors.textSoft} style={styles.subtitle}>
                Define what you want. Clearly, deeply, with the reasons that move you.
              </Text>
            )}

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
            <GoalCard
              goal={item}
              onPress={() => router.push({ pathname: '/goal/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Target}
            title={hasGoals ? 'Nothing here' : 'What do you want?'}
            message={emptyMessage}
          />
        }
      />
      <Fab
        onPress={() =>
          quickAddRef.current?.present((id) =>
            router.push({ pathname: '/goal/[id]', params: { id } }),
          )
        }
      />
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
  header: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 20,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rowWrap: { marginBottom: spacing.lg },
});
