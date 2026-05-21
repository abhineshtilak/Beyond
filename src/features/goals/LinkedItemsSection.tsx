import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { colors, radii, spacing } from '@/theme';
import { HABIT_ICONS } from '@/features/habits/icons';
import { listLinkedTasks, listLinkedHabits } from './repo';

type Props = { goalId: string };

export function LinkedItemsSection({ goalId }: Props) {
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof listLinkedTasks>>>([]);
  const [habits, setHabits] = useState<Awaited<ReturnType<typeof listLinkedHabits>>>([]);

  const reload = useCallback(async () => {
    setTasks(await listLinkedTasks(goalId));
    setHabits(await listLinkedHabits(goalId));
  }, [goalId]);

  useEffect(() => { reload(); }, [reload]);

  if (tasks.length === 0 && habits.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
          Linked actions
        </Text>
        <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Link tasks or habits to this goal from their editor. Their completion will count toward this goal's progress.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      {habits.length > 0 ? (
        <View style={styles.wrap}>
          <View style={styles.head}>
            <Sparkles size={14} color={colors.textMuted} strokeWidth={1.75} />
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Habits supporting this · {habits.length}
            </Text>
          </View>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {habits.map((h) => {
              const Icon = HABIT_ICONS[(h.icon as keyof typeof HABIT_ICONS) ?? 'sparkles'];
              return (
                <View key={h.id} style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: h.color + '33' }]}>
                    <Icon size={16} color={h.color} strokeWidth={1.8} />
                  </View>
                  <Text variant="body" style={{ flex: 1 }}>{h.title}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {tasks.length > 0 ? (
        <View style={styles.wrap}>
          <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
            Tasks under this · {tasks.filter((t) => t.status === 'completed').length}/{tasks.length}
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {tasks.map((t) => {
              const done = t.status === 'completed';
              return (
                <View key={t.id} style={styles.row}>
                  {done ? (
                    <CheckCircle2 size={18} color={colors.text} strokeWidth={1.8} />
                  ) : (
                    <Circle size={18} color={colors.textFaint} strokeWidth={1.8} />
                  )}
                  <Text
                    variant="body"
                    style={{
                      flex: 1,
                      color: done ? colors.textMuted : colors.text,
                      textDecorationLine: done ? 'line-through' : 'none',
                    }}
                    numberOfLines={2}
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
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
