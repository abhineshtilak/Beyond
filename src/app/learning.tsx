import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, GraduationCap, BookOpen } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { colors, radii, spacing } from '@/theme';
import { useLearningStore } from '@/features/learning/store';
import type { LearningStatus, LearningTopic } from '@/features/learning/types';

const STATUS_FILTERS: { key: LearningStatus | 'all'; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Done' },
  { key: 'paused', label: 'Paused' },
  { key: 'all', label: 'All' },
];

export default function LearningScreen() {
  const router = useRouter();
  const items = useLearningStore((s) => s.items);
  const refresh = useLearningStore((s) => s.refresh);
  const [filter, setFilter] = useState<LearningStatus | 'all'>('active');

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const open = (id?: string) =>
    router.push(id ? { pathname: '/learn', params: { id } } : '/learn');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll={false} padded={false}>
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
              <View style={styles.header}>
                <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                    Always growing
                  </Text>
                  <Text variant="h1" style={{ marginTop: 2 }}>Learning</Text>
                </View>
              </View>
              <Text variant="body" color={colors.textSoft}>
                Skills, topics, and the resources you're working through. Track progress without pressure.
              </Text>
              <View style={styles.filters}>
                {STATUS_FILTERS.map((f) => (
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
          renderItem={({ item }) => <TopicRow topic={item} onPress={() => open(item.id)} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <EmptyState
              icon={GraduationCap}
              title="What are you learning?"
              message="Add a topic or skill. Track resources, jot notes, mark progress. No pressure — just growth."
            />
          }
        />
        <Fab onPress={() => open()} />
      </Screen>
    </>
  );
}

function TopicRow({ topic, onPress }: { topic: LearningTopic; onPress: () => void }) {
  const resourcesDone = topic.resources.filter((r) => r.done).length;
  const isDone = topic.status === 'completed';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          {topic.category ? (
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              {topic.category}
            </Text>
          ) : null}
          {topic.status !== 'active' ? (
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              · {topic.status}
            </Text>
          ) : null}
        </View>
        <Text variant="h3" numberOfLines={2} style={{
          textDecorationLine: isDone ? 'line-through' : 'none',
          color: isDone ? colors.textMuted : colors.text,
        }}>
          {topic.title}
        </Text>
        {topic.resources.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <BookOpen size={12} color={colors.textMuted} strokeWidth={2} />
            <Text variant="caption" color={colors.textMuted}>
              {resourcesDone}/{topic.resources.length} RESOURCES
            </Text>
          </View>
        ) : null}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${topic.progress}%` }]} />
        </View>
        <Text variant="caption" color={colors.textMuted}>{topic.progress}% COMPLETE</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: 160 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline, borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  progressTrack: { height: 4, backgroundColor: colors.hairline, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.text, borderRadius: 2 },
});
