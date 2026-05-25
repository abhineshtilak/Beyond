import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { CheckCircle2, Circle, Sparkles, ListTodo } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { useColors, radii, spacing } from '@/theme';
import { HABIT_ICONS } from '@/features/habits/icons';
import { listLinkedTasks, listLinkedHabits } from './repo';

type Props = { goalId: string };

export function LinkedItemsSection({ goalId }: Props) {
  const colors = useColors();
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof listLinkedTasks>>>([]);
  const [habits, setHabits] = useState<Awaited<ReturnType<typeof listLinkedHabits>>>([]);

  const reload = useCallback(async () => {
    const [t, h] = await Promise.all([listLinkedTasks(goalId), listLinkedHabits(goalId)]);
    setTasks(t);
    setHabits(h);
  }, [goalId]);

  useEffect(() => { reload(); }, [reload]);

  if (tasks.length === 0 && habits.length === 0) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
        <View style={styles.head}>
          <ListTodo size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
            Linked actions
          </Text>
        </View>
        <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Link tasks or habits to this goal from their editor. Their completion will count toward progress.
        </Text>
      </View>
    );
  }

  const tasksDone = tasks.filter((t) => t.status === 'completed').length;

  return (
    <View style={{ gap: spacing.md }}>
      {habits.length > 0 ? (
        <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <View style={styles.head}>
            <Sparkles size={14} color={colors.textMuted} strokeWidth={1.75} />
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Daily habits · {habits.length}
            </Text>
          </View>
          <View style={styles.list}>
            {habits.map((h) => {
              const Icon = HABIT_ICONS[(h.icon as keyof typeof HABIT_ICONS) ?? 'sparkles'];
              return (
                <View key={h.id} style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: h.color + '28' }]}>
                    <Icon size={15} color={h.color} strokeWidth={1.8} />
                  </View>
                  <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>{h.title}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {tasks.length > 0 ? (
        <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <View style={styles.head}>
            <ListTodo size={14} color={colors.textMuted} strokeWidth={1.75} />
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Tasks · {tasksDone}/{tasks.length}
            </Text>
          </View>
          {/* Mini progress bar */}
          {tasks.length > 0 ? (
            <View style={[styles.miniTrack, { backgroundColor: colors.hairline }]}>
              <View
                style={[
                  styles.miniFill,
                  {
                    width: `${Math.round((tasksDone / tasks.length) * 100)}%` as any,
                    backgroundColor: colors.text,
                  },
                ]}
              />
            </View>
          ) : null}
          <View style={styles.list}>
            {tasks.map((t) => {
              const done = t.status === 'completed';
              return (
                <View key={t.id} style={styles.row}>
                  {done ? (
                    <CheckCircle2 size={17} color={colors.textSoft} strokeWidth={1.8} />
                  ) : (
                    <Circle size={17} color={colors.textFaint} strokeWidth={1.8} />
                  )}
                  <Text
                    variant="body"
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      color: done ? colors.textMuted : colors.text,
                      textDecorationLine: done ? 'line-through' : 'none',
                    }}
                  >
                    {t.title}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  list: { gap: spacing.sm, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTrack: { height: 3, borderRadius: 2, marginTop: spacing.xs },
  miniFill: { height: 3, borderRadius: 2 },
});
