import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Calendar, Flag, Sparkles } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { Text } from '@/components/Text';
import { ProgressRing } from '@/components/ProgressRing';
import { colors, radii, spacing, shadows } from '@/theme';
import { GOAL_CATEGORY_META } from './types';
import type { GoalWithStats } from './types';

type Props = {
  goal: GoalWithStats;
  onPress: () => void;
};

export function GoalCard({ goal, onPress }: Props) {
  const catMeta = goal.category ? GOAL_CATEGORY_META[goal.category] : null;
  const tint = catMeta?.tint ?? colors.surfaceAlt;

  const daysLabel = (() => {
    if (goal.status === 'completed') return 'Reached';
    if (goal.daysRemaining === null) return 'No deadline';
    if (goal.daysRemaining < 0) return `${Math.abs(goal.daysRemaining)} days overdue`;
    if (goal.daysRemaining === 0) return 'Today';
    if (goal.daysRemaining === 1) return '1 day left';
    return `${goal.daysRemaining} days left`;
  })();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <View style={[styles.hero, { backgroundColor: tint }]}>
        {goal.heroImageUri ? (
          <Image source={{ uri: goal.heroImageUri }} style={StyleSheet.absoluteFillObject} />
        ) : null}
        <View style={styles.heroOverlay} />
        <View style={styles.heroTop}>
          {catMeta ? (
            <View style={styles.chipLight}>
              <Text variant="caption" color={colors.textSoft}>{catMeta.label.toUpperCase()}</Text>
            </View>
          ) : null}
          {goal.status !== 'active' ? (
            <View style={styles.statusChip}>
              <Text variant="caption" color={colors.textSoft}>{goal.status.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.heroBottom}>
          <Text variant="h2" color={colors.text} numberOfLines={2}>{goal.title}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <ProgressRing progress={goal.progress} size={68} strokeWidth={5} color={colors.text} label="%" />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.metaRow}>
            <Calendar size={13} color={colors.textMuted} strokeWidth={1.75} />
            <Text variant="caption" color={colors.textMuted}>
              {goal.targetDate ? format(parseISO(goal.targetDate), 'MMM d, yyyy').toUpperCase() : 'NO DEADLINE'}
            </Text>
          </View>
          <Text variant="bodyMedium">{daysLabel}</Text>
          <View style={styles.statsRow}>
            {goal.milestonesTotal > 0 ? (
              <View style={styles.statItem}>
                <Flag size={11} color={colors.textMuted} strokeWidth={2} />
                <Text variant="caption" color={colors.textMuted}>
                  {goal.milestonesDone}/{goal.milestonesTotal} MILESTONES
                </Text>
              </View>
            ) : null}
            {goal.linkedHabitsTotal > 0 ? (
              <View style={styles.statItem}>
                <Sparkles size={11} color={colors.textMuted} strokeWidth={2} />
                <Text variant="caption" color={colors.textMuted}>{goal.linkedHabitsTotal} HABITS</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
    ...shadows.card,
  },
  hero: {
    height: 140,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.0)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipLight: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  statusChip: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  heroBottom: {},
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 2 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
