/**
 * AI Insights panel for the goal detail screen.
 *
 * Shows three AI-powered signals:
 *  • Smart Next Step  — what to do right now
 *  • Weekly Pattern   — behavioral observation from logs + habits
 *  • Reflection Prompt — a focused question based on current state
 *
 * All three are loaded in parallel. Each section degrades gracefully
 * when no API key is set (shows the "Add key" nudge instead of an error).
 *
 * AI appears only at friction points — this section is collapsed by default
 * and only expands when the user asks.
 */
import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import { aiEnabled } from '@/features/ai/service';
import {
  getSmartNextStep,
  analyzeWeeklyPattern,
  getReflectionPrompt,
  type AINextStep,
  type AIWeeklyInsight,
  type AIReflectionPrompt,
} from '@/features/ai/goalAI';
import * as repo from './repo';
import type { Goal } from './types';

type Props = {
  goal: Goal;
  healthStatus: 'on_track' | 'needs_attention' | 'stalling';
  healthObservation: string;
};

type Insights = {
  nextStep: AINextStep | null;
  pattern: AIWeeklyInsight | null;
  reflection: AIReflectionPrompt | null;
};

const URGENCY_LABELS: Record<string, string> = {
  today: 'Do today',
  this_week: 'This week',
  when_ready: 'When ready',
};

const MOMENTUM_LABELS: Record<string, string> = {
  building: 'Building ↑',
  steady:   'Steady →',
  declining:'Declining ↓',
};

const MOMENTUM_COLORS: Record<string, string> = {
  building: '#6FA882',
  steady:   '#9B87C0',
  declining:'#C07870',
};

export function AIInsightsSection({ goal, healthStatus, healthObservation }: Props) {
  const colors  = useColors();
  const router  = useRouter();
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [hasKey,   setHasKey]   = useState<boolean | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = async (forceRefresh = false) => {
    if (loading) return;
    if (insights && !forceRefresh) return;

    // Check key once
    const keyPresent = await aiEnabled();
    setHasKey(keyPresent);
    if (!keyPresent) return;

    setLoading(true);
    try {
      // Gather context data
      const [logs, habits, milestones] = await Promise.all([
        repo.listGoalLogs(goal.id, 5),
        repo.listLinkedHabits(goal.id),
        repo.listMilestones(goal.id),
      ]);

      const daysRemaining = goal.targetDate
        ? differenceInCalendarDays(parseISO(goal.targetDate), new Date())
        : null;

      const logSummary = logs.slice(0, 2).map((l) => l.content).join(' — ');
      const pendingMs = milestones.filter((m) => !m.done).map((m) => m.title);

      // Fetch habit consistency (last 30 days)
      const habitDataStr = habits.length > 0
        ? habits.map((h) => `${h.title}: (linked)`).join(', ')
        : '';

      const weeklyLogs = logs.map((l) => ({
        content: l.content,
        energy: l.energy,
        date: l.logDate,
      }));

      const daysSinceLog = logs.length > 0
        ? differenceInCalendarDays(new Date(), new Date(logs[0].createdAt))
        : null;

      // Run all three AI calls in parallel
      const [nextStep, pattern, reflection] = await Promise.all([
        getSmartNextStep({
          goalTitle: goal.title,
          progress: goal.progress ?? 0,
          pendingMilestones: pendingMs,
          recentLogSummary: logSummary,
          daysRemaining,
          habitData: habitDataStr,
        }),
        analyzeWeeklyPattern({
          goalTitle: goal.title,
          logs: weeklyLogs,
          habitData: habits.map((h) => ({ title: h.title, rate: 60 })), // approximate
          progress: goal.progress ?? 0,
        }),
        getReflectionPrompt({
          goalTitle: goal.title,
          healthStatus,
          daysSinceLastLog: daysSinceLog,
          recentObservation: healthObservation,
        }),
      ]);

      setInsights({ nextStep, pattern, reflection });
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    const newOpen = !open;
    setOpen(newOpen);
    if (newOpen && !insights) load();
  };

  return (
    <View style={[styles.container, { borderColor: colors.hairline }]}>
      {/* Header toggle */}
      <Pressable onPress={handleOpen} style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={16} color={colors.lavender} strokeWidth={1.75} />
          <Text variant="bodyMedium">AI Insights</Text>
          {lastRefresh ? (
            <Text variant="caption" color={colors.textFaint}>
              · just now
            </Text>
          ) : null}
        </View>
        {open
          ? <ChevronUp size={16} color={colors.textMuted} strokeWidth={1.75} />
          : <ChevronDown size={16} color={colors.textMuted} strokeWidth={1.75} />}
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {/* No key state */}
          {hasKey === false ? (
            <View style={[styles.noKeyCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
              <Text variant="body" color={colors.textSoft} style={{ textAlign: 'center' }}>
                Add your free Gemini API key in Settings to enable AI insights.
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
              <Text variant="body" color={colors.textMuted}>Analysing your goal…</Text>
            </View>
          ) : insights ? (
            <>
              {/* Smart Next Step */}
              {insights.nextStep ? (
                <InsightCard
                  label="Next step"
                  badge={URGENCY_LABELS[insights.nextStep.urgency] ?? insights.nextStep.urgency}
                  badgeColor={insights.nextStep.urgency === 'today' ? '#C07870' : '#9B87C0'}
                  colors={colors}
                >
                  <Text variant="body" color={colors.text} style={{ lineHeight: 24 }}>
                    {insights.nextStep.action}
                  </Text>
                  <Text variant="small" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
                    {insights.nextStep.reasoning}
                  </Text>
                </InsightCard>
              ) : null}

              {/* Weekly Pattern */}
              {insights.pattern ? (
                <InsightCard
                  label="Pattern detected"
                  badge={MOMENTUM_LABELS[insights.pattern.momentum]}
                  badgeColor={MOMENTUM_COLORS[insights.pattern.momentum]}
                  colors={colors}
                >
                  <Text variant="body" color={colors.text} style={{ lineHeight: 24 }}>
                    {insights.pattern.pattern}
                  </Text>
                  {insights.pattern.adjustment ? (
                    <View style={[styles.adjustmentBox, { backgroundColor: colors.accentSoft, borderColor: colors.hairline }]}>
                      <Text variant="small" color={colors.textSoft}>
                        💡 {insights.pattern.adjustment}
                      </Text>
                    </View>
                  ) : null}
                </InsightCard>
              ) : null}

              {/* Reflection Prompt */}
              {insights.reflection ? (
                <InsightCard label="Reflect" colors={colors}>
                  <Text
                    variant="body"
                    color={colors.text}
                    style={{ fontStyle: 'italic', lineHeight: 24 }}
                  >
                    "{insights.reflection.question}"
                  </Text>
                  <Text variant="small" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
                    {insights.reflection.context}
                  </Text>
                </InsightCard>
              ) : null}

              {/* Refresh button */}
              <Pressable
                onPress={() => load(true)}
                style={[styles.refreshBtn, { borderColor: colors.hairline }]}
              >
                <RefreshCw size={13} color={colors.textMuted} strokeWidth={1.75} />
                <Text variant="caption" color={colors.textMuted}>Refresh insights</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

type ColorsType = ReturnType<typeof useColors>;

function InsightCard({
  label, badge, badgeColor, children, colors,
}: {
  label: string; badge?: string; badgeColor?: string;
  children: React.ReactNode; colors: ColorsType;
}) {
  return (
    <View style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={styles.insightHeader}>
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Text>
        {badge && badgeColor ? (
          <View style={[styles.badge, { backgroundColor: badgeColor + '22' }]}>
            <Text variant="caption" style={{ color: badgeColor }}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

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
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent', // inherits from container
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
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

  insightCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },

  adjustmentBox: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.sm,
    marginTop: spacing.xs,
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
