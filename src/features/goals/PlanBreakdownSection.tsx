/**
 * PlanBreakdownSection
 *
 * AI-generated temporal execution plan for a goal.
 * Breaks the goal into: quarterly focus → monthly objectives → weekly actions → daily habits.
 *
 * Generated once, stored in goal.planBreakdown (JSON), refreshable on demand.
 * Works fully offline once generated.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import { aiEnabled } from '@/features/ai/service';
import {
  generateTemporalPlan,
  adjustTemporalPlan,
  type AITemporalPlan,
} from '@/features/ai/goalAI';
import * as repo from './repo';
import type { Goal } from './types';

type Props = {
  goal: Goal;
  onPlanSaved?: () => void;
  healthStatus?: 'on_track' | 'needs_attention' | 'stalling';
};

// ─── small sub-components ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  const colors = useColors();
  return (
    <Text
      variant="caption"
      color={colors.textMuted}
      style={{ textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm }}
    >
      {children}
    </Text>
  );
}

function PeriodRow({
  accent,
  label,
  main,
  sub,
  actions,
}: {
  accent: string;
  label: string;
  main: string;
  sub?: string;
  actions?: string[];
}) {
  const colors = useColors();
  return (
    <View style={styles.periodRow}>
      {/* timeline spine */}
      <View style={styles.spine}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <View style={[styles.line, { backgroundColor: colors.hairline }]} />
      </View>
      {/* content */}
      <View style={styles.periodContent}>
        <View style={[styles.labelChip, { backgroundColor: accent + '22' }]}>
          <Text variant="caption" style={{ color: accent }}>{label}</Text>
        </View>
        <Text variant="bodyMedium" color={colors.text} style={{ marginTop: 4, lineHeight: 22 }}>
          {main}
        </Text>
        {sub ? (
          <Text variant="small" color={colors.textMuted} style={{ marginTop: 2, lineHeight: 18 }}>
            {sub}
          </Text>
        ) : null}
        {actions && actions.length > 0 ? (
          <View style={{ marginTop: spacing.sm, gap: 4 }}>
            {actions.map((a, i) => (
              <View key={i} style={styles.actionRow}>
                <View style={[styles.actionDot, { backgroundColor: accent }]} />
                <Text variant="small" color={colors.textSoft} style={{ flex: 1, lineHeight: 18 }}>
                  {a}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DailyCard({ plan, colors }: { plan: AITemporalPlan; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.dailyCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
      <SectionLabel>Daily non-negotiables</SectionLabel>
      {plan.daily.habits.map((h, i) => (
        <View key={i} style={styles.dailyItem}>
          <Text variant="body" style={{ color: '#9B87C0' }}>○</Text>
          <Text variant="body" color={colors.text} style={{ flex: 1 }}>{h}</Text>
        </View>
      ))}
      {plan.daily.focus ? (
        <View style={[styles.focusBox, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase', marginBottom: 4 }}>
            Daily focus question
          </Text>
          <Text variant="body" color={colors.textSoft} style={{ fontStyle: 'italic' }}>
            "{plan.daily.focus}"
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function PlanBreakdownSection({ goal, onPlanSaved, healthStatus }: Props) {
  const colors = useColors();
  const router  = useRouter();

  const [open,      setOpen]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [adapting,  setAdapting]  = useState(false);
  const [hasKey,    setHasKey]    = useState<boolean | null>(null);
  const [plan,      setPlan]      = useState<AITemporalPlan | null>(() => {
    if (!goal.planBreakdown) return null;
    try { return JSON.parse(goal.planBreakdown); } catch { return null; }
  });

  const generate = useCallback(async (forceRefresh = false) => {
    if (loading) return;
    if (plan && !forceRefresh) return;

    const keyPresent = await aiEnabled();
    setHasKey(keyPresent);
    if (!keyPresent) return;

    setLoading(true);
    try {
      const daysAvailable = goal.targetDate
        ? Math.max(7, differenceInCalendarDays(parseISO(goal.targetDate), new Date()))
        : 90;

      const result = await generateTemporalPlan({
        title:          goal.title,
        targetDate:     goal.targetDate ?? undefined,
        why:            goal.why ?? undefined,
        currentPosition: goal.currentPosition ?? undefined,
        innerObstacles: goal.innerObstacles ?? undefined,
        outerObstacles: goal.outerObstacles ?? undefined,
        skillsNeeded:   goal.skillsNeeded ?? undefined,
        daysAvailable,
      });

      if (result) {
        setPlan(result);
        await repo.updateGoal(goal.id, { planBreakdown: JSON.stringify(result) });
        onPlanSaved?.();
      }
    } finally {
      setLoading(false);
    }
  }, [goal, loading, plan, onPlanSaved]);

  const adaptPlan = useCallback(async () => {
    if (!plan || adapting) return;
    setAdapting(true);
    try {
      const logs = await repo.listGoalLogs(goal.id, 3);
      const habits = await repo.listLinkedHabits(goal.id);
      const daysRemaining = goal.targetDate
        ? differenceInCalendarDays(parseISO(goal.targetDate), new Date())
        : null;
      const recentLogs = logs.map((l) => l.content).join(' / ');
      const habitStr = habits.map((h) => `${h.title}: linked`).join(', ');
      const result = await adjustTemporalPlan({
        title: goal.title,
        currentPlan: plan,
        currentProgress: goal.progress ?? 0,
        daysRemaining,
        recentLogs,
        habitConsistency: habitStr,
        healthStatus: healthStatus ?? 'needs_attention',
      });
      if (result) {
        setPlan(result);
        await repo.updateGoal(goal.id, { planBreakdown: JSON.stringify(result) });
        onPlanSaved?.();
      }
    } finally {
      setAdapting(false);
    }
  }, [plan, adapting, goal, healthStatus, onPlanSaved]);

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && !plan) generate();
  };

  const isEmpty = !plan;

  return (
    <View style={[styles.container, { borderColor: colors.hairline }]}>
      {/* ── header ── */}
      <Pressable onPress={handleOpen} style={styles.header}>
        <View style={styles.headerLeft}>
          <Layers size={16} color={'#9B87C0'} strokeWidth={1.75} />
          <Text variant="bodyMedium">Execution Plan</Text>
          {plan ? (
            <View style={[styles.badge, { backgroundColor: '#9B87C022' }]}>
              <Text variant="caption" style={{ color: '#9B87C0' }}>Generated</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
              <Text variant="caption" color={colors.textMuted}>AI</Text>
            </View>
          )}
        </View>
        {open
          ? <ChevronUp   size={16} color={colors.textMuted} strokeWidth={1.75} />
          : <ChevronDown size={16} color={colors.textMuted} strokeWidth={1.75} />}
      </Pressable>

      {/* ── body ── */}
      {open ? (
        <View style={styles.body}>

          {/* no key */}
          {hasKey === false ? (
            <View style={[styles.noKeyCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
              <Text variant="body" color={colors.textSoft} style={{ textAlign: 'center' }}>
                Add your free Gemini API key in Settings to generate an execution plan.
              </Text>
              <Pressable
                onPress={() => router.push('/settings' as any)}
                style={[styles.noKeyBtn, { backgroundColor: colors.text }]}
              >
                <Text variant="smallMedium" color={colors.bg}>Go to Settings →</Text>
              </Pressable>
            </View>

          ) : loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text variant="body" color={colors.textMuted}>Building your execution plan…</Text>
            </View>

          ) : isEmpty ? (
            /* generate CTA */
            <Pressable
              onPress={() => generate()}
              style={({ pressed }) => [
                styles.generateBtn,
                { backgroundColor: '#9B87C011', borderColor: '#9B87C044' },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Sparkles size={16} color={'#9B87C0'} strokeWidth={1.75} />
              <Text variant="bodyMedium" style={{ color: '#9B87C0' }}>
                Generate execution plan
              </Text>
              <Text variant="small" color={colors.textMuted} style={{ textAlign: 'center' }}>
                Quarterly → Monthly → Weekly → Daily breakdown
              </Text>
            </Pressable>

          ) : plan ? (
            <View style={{ gap: spacing.xl }}>

              {/* QUARTERLY */}
              {plan.quarterly && plan.quarterly.length > 0 ? (
                <View>
                  <SectionLabel>Quarterly roadmap</SectionLabel>
                  {plan.quarterly.map((q, i) => (
                    <PeriodRow
                      key={i}
                      accent={'#9EB7C9'}
                      label={q.label}
                      main={q.focus}
                      sub={`Milestone → ${q.milestone}`}
                    />
                  ))}
                </View>
              ) : null}

              {/* MONTHLY */}
              {plan.monthly && plan.monthly.length > 0 ? (
                <View>
                  <SectionLabel>Next 3 months</SectionLabel>
                  {plan.monthly.map((m, i) => (
                    <PeriodRow
                      key={i}
                      accent={'#A8B89F'}
                      label={m.label}
                      main={m.objective}
                    />
                  ))}
                </View>
              ) : null}

              {/* WEEKLY */}
              {plan.weekly && plan.weekly.length > 0 ? (
                <View>
                  <SectionLabel>Week by week</SectionLabel>
                  {plan.weekly.map((w, i) => (
                    <PeriodRow
                      key={i}
                      accent={'#E8D095'}
                      label={w.label}
                      main={w.theme}
                      actions={w.actions}
                    />
                  ))}
                </View>
              ) : null}

              {/* DAILY */}
              <DailyCard plan={plan} colors={colors} />

              {/* REQUIRED SKILLS */}
              {plan.requiredSkills && plan.requiredSkills.length > 0 ? (
                <View style={[styles.skillsCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
                  <SectionLabel>Skills to build</SectionLabel>
                  <View style={styles.skillsRow}>
                    {plan.requiredSkills.map((s, i) => (
                      <View key={i} style={[styles.skillChip, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                        <Text variant="small" color={colors.textSoft}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* adapt plan when stalling */}
              {(healthStatus === 'stalling' || healthStatus === 'needs_attention') ? (
                <Pressable
                  onPress={adaptPlan}
                  disabled={adapting}
                  style={({ pressed }) => [
                    styles.adaptBtn,
                    { backgroundColor: '#C0787011', borderColor: '#C0787044' },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Zap size={14} color={'#C07870'} strokeWidth={1.75} />
                  <Text variant="smallMedium" style={{ color: '#C07870' }}>
                    {adapting ? 'Adjusting plan…' : 'Adapt plan to current reality'}
                  </Text>
                </Pressable>
              ) : null}

              {/* refresh */}
              <Pressable
                onPress={() => generate(true)}
                style={[styles.refreshBtn, { borderColor: colors.hairline }]}
              >
                <RefreshCw size={13} color={colors.textMuted} strokeWidth={1.75} />
                <Text variant="caption" color={colors.textMuted}>Regenerate plan</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ECE6DA',
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  noKeyCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  noKeyBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  generateBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },

  // timeline row
  periodRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  spine: {
    alignItems: 'center',
    width: 12,
    paddingTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    flex: 1,
    width: 1,
    marginTop: 4,
    minHeight: 16,
  },
  periodContent: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  labelChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  actionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
  },

  // daily card
  dailyCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  dailyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  focusBox: {
    marginTop: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.md,
  },

  // skills
  skillsCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skillChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  adaptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
