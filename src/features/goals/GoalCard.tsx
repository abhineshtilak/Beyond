import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Text } from '@/components/Text';
import { ProgressRing } from '@/components/ProgressRing';
import { radii, spacing, shadows, useColors, useTheme, resolveTint } from '@/theme';
import { GOAL_CATEGORY_META, GOAL_PRIORITY_META } from './types';
import type { GoalWithStats } from './types';

type Props = {
  goal: GoalWithStats;
  onPress: () => void;
};

/** Return a color that communicates urgency without alarm. */
function urgencyColor(daysRemaining: number | null, status: string): string {
  if (status === 'completed') return 'transparent'; // no badge shown
  if (daysRemaining === null) return 'transparent';
  if (daysRemaining < 0) return '#B97A6B';   // overdue — rose
  if (daysRemaining <= 7) return '#C9664F';  // urgent — terracotta
  if (daysRemaining <= 30) return '#C4904A'; // approaching — amber
  return 'transparent'; // plenty of time — no badge
}

/** Concise days label for card footer. */
function daysLabel(daysRemaining: number | null, status: string): string {
  if (status === 'completed') return 'Reached';
  if (daysRemaining === null) return 'No deadline';
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)}d overdue`;
  if (daysRemaining === 0) return 'Due today';
  if (daysRemaining === 1) return '1 day left';
  if (daysRemaining <= 30) return `${daysRemaining} days left`;
  return format(parseISO(new Date(Date.now() + daysRemaining * 86400000).toISOString().slice(0, 10)), 'MMM d, yyyy');
}

/** Contextual label for progress %. */
function progressLabel(pct: number, status: string): string {
  if (status === 'completed') return 'Reached ✓';
  if (pct === 0) return 'Not started';
  if (pct <= 25) return 'Just started';
  if (pct <= 50) return 'Halfway there';
  if (pct <= 75) return 'Strong progress';
  if (pct < 100) return 'Nearly there';
  return 'Done ✓';
}

const MAX_DOTS = 8;

export function GoalCard({ goal, onPress }: Props) {
  const colors = useColors();
  const { resolved } = useTheme();

  const catMeta = goal.category ? GOAL_CATEGORY_META[goal.category] : null;
  const tint = resolveTint(catMeta?.tint, resolved) ?? colors.surfaceAlt;
  const udColor = urgencyColor(goal.daysRemaining, goal.status);
  const showUrgencyBadge = udColor !== 'transparent';
  const chipBg = resolved === 'light' ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.14)';

  // Milestone dots — up to MAX_DOTS
  const totalDots = Math.min(goal.milestonesTotal, MAX_DOTS);
  const extraDots = goal.milestonesTotal > MAX_DOTS ? goal.milestonesTotal - MAX_DOTS : 0;
  const showDots = goal.milestonesTotal > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface },
        pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
      ]}
    >
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <View style={[styles.hero, { backgroundColor: tint }]}>
        {goal.heroImageUri ? (
          <Image
            source={{ uri: goal.heroImageUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : null}
        {goal.heroImageUri ? <View style={styles.imgOverlay} /> : null}

        {/* Top chips */}
        <View style={styles.heroTop}>
          <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
            {catMeta ? (
              <View style={[styles.chip, { backgroundColor: chipBg }]}>
                <Text variant="caption" color={colors.textSoft}>{catMeta.label}</Text>
              </View>
            ) : null}
            {goal.status !== 'active' ? (
              <View style={[styles.chip, { backgroundColor: chipBg }]}>
                <Text variant="caption" color={colors.textSoft}>
                  {goal.status === 'completed' ? 'Reached' : goal.status === 'paused' ? 'Paused' : 'Let go'}
                </Text>
              </View>
            ) : null}
          </View>
          {/* Priority badge — only show "Now" to avoid noise */}
          {goal.priority === 3 && goal.status === 'active' ? (
            <View style={[styles.chip, { backgroundColor: '#C9664F22', borderWidth: 1, borderColor: '#C9664F55' }]}>
              <Text variant="caption" style={{ color: '#C9664F' }}>NOW</Text>
            </View>
          ) : null}
        </View>

        {/* Title — always at bottom of hero */}
        <Text variant="h2" numberOfLines={2}>{goal.title}</Text>
      </View>

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      <View style={[styles.progressTrack, { backgroundColor: colors.hairline }]}>
        {goal.progress > 0 ? (
          <View
            style={[
              styles.progressFill,
              { width: `${goal.progress}%` as any, backgroundColor: colors.text },
            ]}
          />
        ) : null}
      </View>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <View style={styles.body}>
        {/* Progress ring + % */}
        <View style={styles.ringWrap}>
          <ProgressRing progress={goal.progress} size={60} strokeWidth={4.5} color={colors.text} />
        </View>

        <View style={styles.meta}>
          {/* Progress context line */}
          <Text variant="bodyMedium">
            {goal.progress}%
            {'  '}
            <Text variant="body" color={colors.textSoft}>
              {progressLabel(goal.progress, goal.status)}
            </Text>
          </Text>

          {/* Days + urgency */}
          <View style={styles.daysRow}>
            {showUrgencyBadge ? (
              <View style={[styles.urgencyDot, { backgroundColor: udColor }]} />
            ) : null}
            <Text
              variant="caption"
              color={showUrgencyBadge ? udColor : colors.textMuted}
              style={showUrgencyBadge ? { fontWeight: '600' } : undefined}
            >
              {daysLabel(goal.daysRemaining, goal.status)}
            </Text>
          </View>

          {/* Milestone dots */}
          {showDots ? (
            <View style={styles.dotsRow}>
              {Array.from({ length: totalDots }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i < goal.milestonesDone ? colors.text : colors.hairline,
                    },
                  ]}
                />
              ))}
              {extraDots > 0 ? (
                <Text variant="caption" color={colors.textFaint}>+{extraDots}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  hero: {
    height: 156,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  progressTrack: {
    height: 4,
    width: '100%',
  },
  progressFill: {
    height: 4,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    gap: 5,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
