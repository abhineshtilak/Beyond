import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  Pencil,
  Trash2,
  ImagePlus,
  CheckCircle2,
  Pause,
  Play,
  FileText,
} from 'lucide-react-native';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { ProgressRing } from '@/components/ProgressRing';
import { GoalContextMap } from '@/features/goals/GoalContextMap';
import { radii, spacing, useColors, useTheme, resolveTint } from '@/theme';
import { confirm } from '@/lib/confirm';
import { playCompletionSound } from '@/lib/completionSound';
import * as repo from '@/features/goals/repo';
import { useGoalsStore } from '@/features/goals/store';
import { GOAL_CATEGORY_META, GOAL_PRIORITY_META, GOAL_STATUS_META } from '@/features/goals/types';
import type { Goal } from '@/features/goals/types';
import { MilestonesSection } from '@/features/goals/MilestonesSection';
import { LinkedItemsSection } from '@/features/goals/LinkedItemsSection';
import { InspirationSection } from '@/features/goals/InspirationSection';
import { GoalLogsSection } from '@/features/goals/GoalLogsSection';
import { GoalBasicsEditor, GoalBasicsEditorRef } from '@/features/goals/GoalBasicsEditor';
import { ProgressSheet, ProgressSheetRef } from '@/features/goals/ProgressSheet';
import { AIInsightsSection } from '@/features/goals/AIInsightsSection';
import { PlanBreakdownSection } from '@/features/goals/PlanBreakdownSection';
import { GoalDebriefSheet, GoalDebriefSheetRef } from '@/features/goals/GoalDebriefSheet';
import { SkillsSection } from '@/features/goals/SkillsSection';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { resolved } = useTheme();
  const refreshList = useGoalsStore((s) => s.refresh);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [health, setHealth] = useState<{
    score: number;
    status: 'on_track' | 'needs_attention' | 'stalling';
    observations: string[];
  } | null>(null);
  const basicsRef = useRef<GoalBasicsEditorRef>(null);
  const progressSheetRef = useRef<ProgressSheetRef>(null);
  const debriefRef = useRef<GoalDebriefSheetRef>(null);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [g, h] = await Promise.all([
      repo.getGoal(id),
      repo.goalHealthScore(id),
    ]);
    setGoal(g);
    setHealth(h);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const bump = () => setReloadKey((k) => k + 1);

  const update = useCallback(async (patch: Parameters<typeof repo.updateGoal>[1]) => {
    if (!goal) return;
    const next = await repo.updateGoal(goal.id, patch);
    setGoal(next);
    refreshList();
    bump();
  }, [goal, refreshList]);

  const pickHero = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to set a hero image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      aspect: [16, 10],
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) {
      await update({ heroImageUri: res.assets[0].uri });
    }
  };

  const removeHero = () => {
    if (!goal?.heroImageUri) return;
    Alert.alert('Remove hero image?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => update({ heroImageUri: null }) },
    ]);
  };

  const handleDelete = async () => {
    if (!goal) return;
    const ok = await confirm({
      title: 'Delete goal',
      message: `Remove "${goal.title}" and all its milestones and inspirations? Linked tasks and habits will be unlinked but not deleted.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await repo.deleteGoal(goal.id);
    refreshList();
    router.back();
  };

  const cycleStatus = async () => {
    if (!goal) return;
    const cycle = { active: 'paused', paused: 'active', completed: 'active', abandoned: 'active' } as const;
    await update({ status: cycle[goal.status] });
  };

  const markComplete = async () => {
    if (!goal) return;
    await update({ status: 'completed', manualProgress: 100 });
    playCompletionSound();
  };

  if (loading || !goal) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.text} />
      </SafeAreaView>
    );
  }

  const catMeta = goal.category ? GOAL_CATEGORY_META[goal.category] : null;
  const tint = resolveTint(catMeta?.tint, resolved) ?? colors.surfaceAlt;
  const daysRemaining = goal.targetDate ? differenceInCalendarDays(parseISO(goal.targetDate), new Date()) : null;

  const daysLabel = (() => {
    if (goal.status === 'completed') return 'Reached';
    if (daysRemaining === null) return 'No deadline';
    if (daysRemaining < 0) return `${Math.abs(daysRemaining)} days overdue`;
    if (daysRemaining === 0) return 'Today';
    if (daysRemaining === 1) return '1 day to go';
    return `${daysRemaining} days to go`;
  })();

  const milestonesLabel = (() => {
    if (goal.status === 'completed') return 'Goal reached ✓';
    if (goal.progress === 0) return 'Not started yet';
    if (goal.progress <= 25) return 'Just getting started';
    if (goal.progress <= 50) return 'Halfway there';
    if (goal.progress <= 75) return 'Strong progress';
    if (goal.progress < 100) return 'Nearly there — keep going';
    return 'Done ✓';
  })();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* HERO */}
          <View style={[styles.hero, { backgroundColor: tint }]}>
            {goal.heroImageUri ? (
              <Image source={{ uri: goal.heroImageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : null}
            <View style={[styles.heroOverlay, goal.heroImageUri ? styles.heroOverlayImg : null]} />
            <SafeAreaView edges={['top']} style={styles.heroSafe}>
              <View style={styles.heroNav}>
                <IconButton icon={ChevronLeft} onPress={() => router.back()} bg="rgba(255,255,255,0.85)" />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <IconButton
                    icon={ImagePlus}
                    onPress={goal.heroImageUri ? removeHero : pickHero}
                    bg="rgba(255,255,255,0.85)"
                  />
                  <IconButton
                    icon={Pencil}
                    onPress={() => basicsRef.current?.present(goal)}
                    bg="rgba(255,255,255,0.85)"
                  />
                </View>
              </View>

              <View style={styles.heroBottom}>
                <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                  {catMeta ? (
                    <View style={styles.chip}>
                      <Text variant="caption" color={colors.textSoft}>{catMeta.label.toUpperCase()}</Text>
                    </View>
                  ) : null}
                  <View style={styles.chip}>
                    <Text variant="caption" color={colors.textSoft}>
                      {GOAL_PRIORITY_META[goal.priority].label.toUpperCase()}
                    </Text>
                  </View>
                  {goal.status !== 'active' ? (
                    <View style={styles.chip}>
                      <Text variant="caption" color={colors.textSoft}>
                        {GOAL_STATUS_META[goal.status].label.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text variant="display" style={{ marginTop: spacing.sm }}>{goal.title}</Text>
              </View>
            </SafeAreaView>
          </View>

          {/* PROGRESS BLOCK */}
          <Pressable
            style={({ pressed }) => [styles.progressBlock, pressed && { opacity: 0.75 }]}
            onPress={() => {
              progressSheetRef.current?.present(
                goal.manualProgress ?? goal.progress ?? 0,
                async (val) => {
                  await update({ manualProgress: val });
                },
              );
            }}
          >
            <ProgressRing progress={goal.progress} size={92} strokeWidth={7} label="%" />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                  Progress · tap to set
                </Text>
                {health ? (
                  <View style={[
                    styles.healthBadge,
                    { backgroundColor:
                        health.status === 'on_track'        ? '#6FA88222'
                      : health.status === 'needs_attention' ? '#C8A44222'
                      :                                       '#C0787022',
                    },
                  ]}>
                    <Text variant="caption" style={{ color:
                        health.status === 'on_track'        ? '#6FA882'
                      : health.status === 'needs_attention' ? '#C8A442'
                      :                                       '#C07870',
                    }}>
                      {health.status === 'on_track'        ? '● On track'
                      : health.status === 'needs_attention' ? '● Watch'
                      :                                       '● Stalling'}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="h2">{milestonesLabel}</Text>
              <Text variant="body" color={colors.textSoft}>
                {goal.targetDate ? `${format(parseISO(goal.targetDate), 'MMM d, yyyy')} · ${daysLabel}` : daysLabel}
              </Text>
              {/* Surface top health observation inline */}
              {health?.observations[0] ? (
                <Text variant="small" color={colors.textFaint} style={{ marginTop: 4 }}>
                  {health.observations[0]}
                </Text>
              ) : null}
            </View>
          </Pressable>

          {/* QUICK ACTIONS */}
          <View style={styles.quickActions}>
            {goal.status !== 'completed' ? (
              <Pressable onPress={markComplete} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.hairline }, pressed && { opacity: 0.8 }]}>
                <CheckCircle2 size={16} color={colors.text} strokeWidth={1.8} />
                <Text variant="smallMedium">Mark reached</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={cycleStatus} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.hairline }, pressed && { opacity: 0.8 }]}>
              {goal.status === 'paused' ? (
                <Play size={16} color={colors.text} strokeWidth={1.8} />
              ) : (
                <Pause size={16} color={colors.text} strokeWidth={1.8} />
              )}
              <Text variant="smallMedium">{goal.status === 'paused' ? 'Resume' : 'Pause'}</Text>
            </Pressable>
            {(goal.status === 'completed' || goal.status === 'abandoned') ? (
              <Pressable
                onPress={() => debriefRef.current?.present(goal)}
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: '#9B87C011', borderColor: '#9B87C044' }, pressed && { opacity: 0.8 }]}
              >
                <FileText size={16} color={'#9B87C0'} strokeWidth={1.8} />
                <Text variant="smallMedium" style={{ color: '#9B87C0' }}>Debrief</Text>
              </Pressable>
            ) : null}
          </View>

          {/* SECTIONS */}
          <View style={styles.sections}>
            {/* ── Context Map: journey from current → goal ── */}
            <View style={[styles.mapCard, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
              <GoalContextMap goal={goal} onUpdate={update} />
            </View>

            {/* ── Milestones path + Skills ── */}
            <MilestonesSection
              key={`ms-${reloadKey}`}
              goalId={goal.id}
              onProgressChange={load}
            />
            <SkillsSection goal={goal} onUpdate={update} />

            {/* ── Progress log ── */}
            <GoalLogsSection key={`logs-${reloadKey}`} goalId={goal.id} />

            {/* ── AI insights ── */}
            {health ? (
              <AIInsightsSection
                key={`ai-${reloadKey}`}
                goal={goal}
                healthStatus={health.status}
                healthObservation={health.observations[0] ?? ''}
              />
            ) : null}

            {/* ── Execution plan ── */}
            <PlanBreakdownSection
              key={`plan-${reloadKey}`}
              goal={goal}
              onPlanSaved={load}
              healthStatus={health?.status}
            />

            {/* ── Linked habits & tasks ── */}
            <LinkedItemsSection key={`li-${reloadKey}`} goalId={goal.id} />

            {/* ── Inspiration ── */}
            <InspirationSection key={`ins-${reloadKey}`} goalId={goal.id} />

            {/* DANGER ZONE — separated from content by distance and weight */}
            <View style={[styles.dangerZone, { borderColor: colors.hairline }]}>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.6 }]}
              >
                <Trash2 size={15} color="#B97A6B" strokeWidth={1.8} />
                <Text variant="smallMedium" color="#B97A6B">Delete this goal</Text>
              </Pressable>
              <Text variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: spacing.xs }}>
                Milestones and inspirations will be removed.{'\n'}Linked tasks and habits will be unlinked, not deleted.
              </Text>
            </View>
          </View>
        </ScrollView>

        <GoalBasicsEditor ref={basicsRef} onSaved={() => { load(); refreshList(); }} />
        <ProgressSheet ref={progressSheetRef} />
        <GoalDebriefSheet ref={debriefRef} />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 260,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  heroOverlayImg: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  heroSafe: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    minHeight: 260,
  },
  heroNav: { flexDirection: 'row', justifyContent: 'space-between' },
  heroBottom: { marginTop: spacing.huge },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  progressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    padding: spacing.xxl,
    paddingTop: spacing.xl,
  },
  healthBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  sections: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  mapCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingTop: spacing.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.lg,
    paddingBottom: spacing.sm,
  },
  dangerZone: {
    marginTop: spacing.xxl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
