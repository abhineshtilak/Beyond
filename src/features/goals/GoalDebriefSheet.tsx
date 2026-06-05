/**
 * GoalDebriefSheet
 *
 * Retrospective AI debrief — triggered when a goal is completed or abandoned.
 * Uses the existing generateGoalDebrief() AI function.
 *
 * Shows 4 sections:
 *  • What worked
 *  • What failed / what slowed progress
 *  • Key lesson (most transferable insight)
 *  • For next time (one concrete change)
 */
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
} from 'lucide-react-native';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Sheet, SheetRef } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import {
  generateGoalDebrief,
  type AIGoalDebrief,
} from '@/features/ai/goalAI';
import * as repo from './repo';
import type { Goal } from './types';

// ─── public API ───────────────────────────────────────────────────────────────

export type GoalDebriefSheetRef = {
  present: (goal: Goal) => void;
  dismiss: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Props = {};

// ─── debrief card ─────────────────────────────────────────────────────────────

function DebriefCard({
  icon,
  accent,
  label,
  content,
  colors,
}: {
  icon: React.ReactNode;
  accent: string;
  label: string;
  content: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={styles.cardHeader}>
        {icon}
        <Text
          variant="caption"
          color={colors.textMuted}
          style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          {label}
        </Text>
        <View style={[styles.accentLine, { backgroundColor: accent }]} />
      </View>
      <Text variant="body" color={colors.text} style={{ lineHeight: 24 }}>
        {content}
      </Text>
    </View>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export const GoalDebriefSheet = forwardRef<GoalDebriefSheetRef, Props>(
  function GoalDebriefSheet(_props, ref) {
    const sheetRef  = useRef<SheetRef>(null);
    const colors    = useColors();

    const [goal,    setGoal]    = useState<Goal | null>(null);
    const [debrief, setDebrief] = useState<AIGoalDebrief | null>(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(false);

    // ── public methods ──────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      present: (g: Goal) => {
        setGoal(g);
        setDebrief(null);
        setError(false);
        sheetRef.current?.present();
        runDebrief(g);
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    // ── AI call ─────────────────────────────────────────────────────────────
    const runDebrief = async (g: Goal) => {
      setLoading(true);
      setError(false);
      try {
        const [logs, milestones] = await Promise.all([
          repo.listGoalLogs(g.id, 100),
          repo.listMilestones(g.id),
        ]);
        const achieved = milestones.filter((m) => m.done).length;
        const duration = differenceInCalendarDays(
          new Date(),
          new Date(g.createdAt),
        );
        const result = await generateGoalDebrief({
          goalTitle:         g.title,
          finalProgress:     g.progress,
          totalLogs:         logs.length,
          achievedMilestones: achieved,
          totalMilestones:   milestones.length,
          durationDays:      Math.max(1, duration),
          status:            g.status === 'completed' ? 'completed' : 'abandoned',
        });
        if (result) {
          setDebrief(result);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    const handleRefresh = () => {
      if (goal) runDebrief(goal);
    };

    // ── header badge ────────────────────────────────────────────────────────
    const isCompleted = goal?.status === 'completed';
    const badgeColor  = isCompleted ? '#6FA882' : '#C07870';
    const statusLabel = isCompleted ? '✓ Goal reached' : 'Goal ended';

    return (
      <Sheet
        ref={sheetRef}
        title="Goal Debrief"
        snapPoints={['85%']}
      >
        {/* status badge */}
        {goal ? (
          <View style={styles.topRow}>
            <View style={[styles.statusBadge, { backgroundColor: badgeColor + '22' }]}>
              <Text variant="smallMedium" style={{ color: badgeColor }}>
                {statusLabel}
              </Text>
            </View>
            <Text variant="body" color={colors.textMuted} style={{ flex: 1, textAlign: 'right' }}>
              {goal.progress}% complete
            </Text>
          </View>
        ) : null}

        {goal ? (
          <Text variant="h2" color={colors.text} style={{ marginBottom: spacing.xl }}>
            {goal.title}
          </Text>
        ) : null}

        {/* content */}
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.textMuted} />
            <Text variant="body" color={colors.textMuted}>
              Analysing your journey…
            </Text>
          </View>

        ) : error ? (
          <View style={[styles.errorCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
            <Text variant="body" color={colors.textSoft} style={{ textAlign: 'center' }}>
              Couldn't generate debrief. Add your API key in Settings or try again.
            </Text>
            <Pressable
              onPress={handleRefresh}
              style={[styles.retryBtn, { borderColor: colors.hairline }]}
            >
              <RefreshCw size={14} color={colors.textMuted} strokeWidth={1.75} />
              <Text variant="smallMedium" color={colors.textMuted}>Try again</Text>
            </Pressable>
          </View>

        ) : debrief ? (
          <View style={{ gap: spacing.md }}>
            <DebriefCard
              icon={<CheckCircle2 size={15} color="#6FA882" strokeWidth={1.75} />}
              accent="#6FA882"
              label="What worked"
              content={debrief.whatWorked}
              colors={colors}
            />
            <DebriefCard
              icon={<XCircle size={15} color="#C07870" strokeWidth={1.75} />}
              accent="#C07870"
              label={isCompleted ? 'What slowed you down' : 'What led here'}
              content={debrief.whatFailed}
              colors={colors}
            />
            <DebriefCard
              icon={<Lightbulb size={15} color="#E8D095" strokeWidth={1.75} />}
              accent="#E8D095"
              label="Key lesson"
              content={debrief.keyLesson}
              colors={colors}
            />
            <DebriefCard
              icon={<ArrowRight size={15} color="#9B87C0" strokeWidth={1.75} />}
              accent="#9B87C0"
              label="For next time"
              content={debrief.forNextTime}
              colors={colors}
            />

            <Pressable
              onPress={handleRefresh}
              style={[styles.refreshBtn, { borderColor: colors.hairline }]}
            >
              <RefreshCw size={13} color={colors.textMuted} strokeWidth={1.75} />
              <Text variant="caption" color={colors.textMuted}>Regenerate debrief</Text>
            </Pressable>
          </View>
        ) : null}
      </Sheet>
    );
  },
);

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  errorCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accentLine: {
    flex: 1,
    height: 1,
    marginLeft: spacing.sm,
    opacity: 0.4,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
});
