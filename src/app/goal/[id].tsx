import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
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
} from 'lucide-react-native';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { ProgressRing } from '@/components/ProgressRing';
import { EditableSection } from '@/components/EditableSection';
import { colors, radii, spacing, palette } from '@/theme';
import { confirm } from '@/lib/confirm';
import * as repo from '@/features/goals/repo';
import { useGoalsStore } from '@/features/goals/store';
import { GOAL_CATEGORY_META, GOAL_PRIORITY_META, GOAL_STATUS_META } from '@/features/goals/types';
import type { Goal } from '@/features/goals/types';
import { MilestonesSection } from '@/features/goals/MilestonesSection';
import { LinkedItemsSection } from '@/features/goals/LinkedItemsSection';
import { InspirationSection } from '@/features/goals/InspirationSection';
import { EditFieldSheet, EditFieldSheetRef } from '@/features/goals/EditFieldSheet';
import { GoalBasicsEditor, GoalBasicsEditorRef } from '@/features/goals/GoalBasicsEditor';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const refreshList = useGoalsStore((s) => s.refresh);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const editFieldRef = useRef<EditFieldSheetRef>(null);
  const basicsRef = useRef<GoalBasicsEditorRef>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const g = await repo.getGoal(id);
    setGoal(g);
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

  const editText = (label: string, key: keyof Goal, placeholder: string, sectionLabel: string) => {
    editFieldRef.current?.present({
      title: `Edit ${label}`,
      label: sectionLabel,
      placeholder,
      initialValue: (goal?.[key] as string | null) ?? '',
      onSave: async (value) => {
        await update({ [key]: value } as any);
      },
    });
  };

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
  };

  if (loading || !goal) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.text} />
      </SafeAreaView>
    );
  }

  const catMeta = goal.category ? GOAL_CATEGORY_META[goal.category] : null;
  const tint = catMeta?.tint ?? palette.creamSoft;
  const daysRemaining = goal.targetDate ? differenceInCalendarDays(parseISO(goal.targetDate), new Date()) : null;

  const daysLabel = (() => {
    if (goal.status === 'completed') return 'Reached';
    if (daysRemaining === null) return 'No deadline';
    if (daysRemaining < 0) return `${Math.abs(daysRemaining)} days overdue`;
    if (daysRemaining === 0) return 'Today';
    if (daysRemaining === 1) return '1 day to go';
    return `${daysRemaining} days to go`;
  })();

  const milestonesLabel = goal.progress > 0 ? `${goal.progress}% complete` : 'Not started yet';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          showsVerticalScrollIndicator={false}
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
          <View style={styles.progressBlock}>
            <ProgressRing progress={goal.progress} size={92} strokeWidth={7} label="%" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                Progress
              </Text>
              <Text variant="h2">{milestonesLabel}</Text>
              <Text variant="body" color={colors.textSoft}>
                {goal.targetDate ? `${format(parseISO(goal.targetDate), 'MMM d, yyyy')} · ${daysLabel}` : daysLabel}
              </Text>
            </View>
          </View>

          {/* QUICK ACTIONS */}
          <View style={styles.quickActions}>
            {goal.status !== 'completed' ? (
              <Pressable onPress={markComplete} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
                <CheckCircle2 size={16} color={colors.text} strokeWidth={1.8} />
                <Text variant="smallMedium">Mark reached</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={cycleStatus} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
              {goal.status === 'paused' ? (
                <Play size={16} color={colors.text} strokeWidth={1.8} />
              ) : (
                <Pause size={16} color={colors.text} strokeWidth={1.8} />
              )}
              <Text variant="smallMedium">{goal.status === 'paused' ? 'Resume' : 'Pause'}</Text>
            </Pressable>
            <Pressable onPress={handleDelete} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
              <Trash2 size={16} color="#B97A6B" strokeWidth={1.8} />
              <Text variant="smallMedium" color="#B97A6B">Delete</Text>
            </Pressable>
          </View>

          {/* SECTIONS */}
          <View style={styles.sections}>
            <EditableSection
              label="Why does this matter"
              value={goal.why}
              placeholder="Why this, and why now? The reason has to be larger than your resistance."
              onPress={() => editText('your why', 'why', 'The reason behind this goal...', 'Your why')}
              tint={palette.creamSoft}
              serif
            />
            <EditableSection
              label="How it'll feel"
              value={goal.feeling}
              placeholder="When you reach this — what does that day look and feel like?"
              onPress={() => editText('the feeling', 'feeling', 'The feeling of having reached it...', 'How it will feel')}
            />

            <MilestonesSection key={`ms-${reloadKey}`} goalId={goal.id} onProgressChange={load} />

            <EditableSection
              label="Action plan"
              value={goal.procedure}
              placeholder="The proven procedure. Daily, weekly. What works?"
              onPress={() => editText('the plan', 'procedure', 'The roadmap, the moves, the cadence...', 'Action plan')}
            />

            <LinkedItemsSection key={`li-${reloadKey}`} goalId={goal.id} />

            <EditableSection
              label="Where I am now"
              value={goal.currentPosition}
              placeholder="The honest baseline. What's true today?"
              onPress={() => editText('current position', 'currentPosition', 'Where you stand right now...', 'Current position')}
            />
            <EditableSection
              label="What's in the way"
              value={goal.problems}
              placeholder="Obstacles, fears, missing pieces. Name them."
              onPress={() => editText('the obstacles', 'problems', 'What stands between you and this...', 'Obstacles')}
            />

            <InspirationSection key={`ins-${reloadKey}`} goalId={goal.id} />
          </View>
        </ScrollView>

        <EditFieldSheet ref={editFieldRef} />
        <GoalBasicsEditor ref={basicsRef} onSaved={() => { load(); refreshList(); }} />
      </View>
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  sections: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
});
