import React, { useMemo, useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, Image, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Target,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  NotebookPen,
  ArrowRight,
  Flame,
  Zap,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Checkbox } from '@/components/Checkbox';
import { Icon } from '@/components/Icon';
import { ProgressRing } from '@/components/ProgressRing';
import { RotatingGreeting } from '@/components/RotatingGreeting';
import { spacing, radii, useColors, useTheme, resolveTint } from '@/theme';
import { ymd } from '@/lib/date';
import { useTasksStore, selectFiltered } from '@/features/tasks/store';
import { useHabitsStore } from '@/features/habits/store';
import { useGoalsStore } from '@/features/goals/store';
import { useProfileStore } from '@/features/profile/store';
import { useJournalStore } from '@/features/journal/store';
import { useDiaryStore } from '@/features/diary/store';
import { GOAL_CATEGORY_META } from '@/features/goals/types';
import { MoodPicker } from '@/features/diary/MoodPicker';
import { MOOD_META } from '@/features/diary/types';
import { OnThisDayCard } from '@/components/OnThisDayCard';
import { getOnThisDay, type OnThisDayEntry } from '@/lib/onThisDay';

export default function HomeScreen() {
  const colors = useColors();
  const { resolved } = useTheme();
  const router = useRouter();

  const refreshTasks = useTasksStore((s) => s.refresh);
  const tasks = useTasksStore((s) => s.tasks);
  const toggleTask = useTasksStore((s) => s.toggleComplete);
  const refreshHabits = useHabitsStore((s) => s.refresh);
  const habits = useHabitsStore((s) => s.habits);
  const toggleHabit = useHabitsStore((s) => s.toggleToday);
  const refreshGoals = useGoalsStore((s) => s.refresh);
  const goals = useGoalsStore((s) => s.goals);
  const profile = useProfileStore((s) => s.profile);
  const refreshProfile = useProfileStore((s) => s.refresh);

  const journalStreak = useJournalStore((s) => s.streak);
  const todayJournalCount = useJournalStore((s) => s.todayCount);
  const refreshJournal = useJournalStore((s) => s.refresh);

  const todayDiary     = useDiaryStore((s) => s.today);
  const loadDiary      = useDiaryStore((s) => s.loadToday);
  const setDiaryMood   = useDiaryStore((s) => s.setMood);
  const reflStreak     = useDiaryStore((s) => s.reflStreak);
  const loadReflStreak = useDiaryStore((s) => s.loadReflStreak);

  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const [onThisDay, setOnThisDay] = useState<OnThisDayEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      refreshTasks();
      refreshHabits();
      refreshGoals();
      refreshProfile();
      refreshJournal();
      loadDiary();
      loadReflStreak();
      getOnThisDay().then((r) => setOnThisDay(r.entries)).catch(() => {});
    }, [refreshTasks, refreshHabits, refreshGoals, refreshProfile, refreshJournal, loadDiary]),
  );

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);
  const sortedGoals = useMemo(() => {
    return [...activeGoals].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const aDays = a.daysRemaining ?? Infinity;
      const bDays = b.daysRemaining ?? Infinity;
      return aDays - bDays;
    });
  }, [activeGoals]);
  const avgGoalProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length)
    : 0;

  const todayTasks = useMemo(() => selectFiltered(tasks, 'today').slice(0, 5), [tasks]);
  const completedToday = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === 'completed' &&
          t.completedAt &&
          new Date(t.completedAt).toISOString().slice(0, 10) === ymd(),
      ).length,
    [tasks],
  );
  const habitsDone = habits.filter((h) => h.doneToday).length;
  const pendingHabits = habits.filter((h) => !h.doneToday);

  const initials = profile.name?.trim()
    ? profile.name
        .trim()
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : null;

  const goalsToShow = goalsExpanded ? sortedGoals : sortedGoals.slice(0, 1);

  return (
    <Screen scroll padded={false}>
      <View style={{ gap: spacing.xxl, paddingTop: spacing.xl, paddingBottom: 200 }}>

        {/* ── Top row: greeting + profile ── */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <RotatingGreeting name={profile.name} />
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.profileBtn,
              { backgroundColor: colors.accentSoft },
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={6}
          >
            {profile.photoUri ? (
              <Image source={{ uri: profile.photoUri }} style={styles.profileImg} />
            ) : initials ? (
              <Text variant="smallMedium" color={colors.textSoft}>{initials}</Text>
            ) : (
              <SettingsIcon size={18} color={colors.textSoft} strokeWidth={1.75} />
            )}
          </Pressable>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <StatBox
            label="Reflection"
            value={reflStreak > 0 ? `${reflStreak}d` : journalStreak > 0 ? `${journalStreak}d` : `${todayJournalCount}`}
            sub={reflStreak > 0 ? 'STREAK' : journalStreak > 0 ? 'JOURNAL' : 'ENTRIES'}
            tint={colors.accentSoft}
            icon={reflStreak >= 3 ? Flame : undefined}
            onPress={() => router.push('/(tabs)/journal')}
          />
          <StatBox
            label="Habits"
            value={`${habitsDone}/${habits.length || 0}`}
            sub="TODAY"
            tint={colors.butterSoft}
            onPress={() => router.push('/(tabs)/actions')}
          />
          <StatBox
            label="Tasks"
            value={completedToday.toString()}
            sub="DONE"
            tint={colors.peachSoft}
            onPress={() => router.push('/(tabs)/actions')}
          />
        </View>

        {/* ── Active goals ── */}
        {sortedGoals.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <View style={styles.sectionHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Target size={13} color={colors.textMuted} strokeWidth={1.75} />
                <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                  {activeGoals.length} goal{activeGoals.length === 1 ? '' : 's'} · avg {avgGoalProgress}%
                </Text>
              </View>
              {sortedGoals.length > 1 ? (
                <Pressable onPress={() => setGoalsExpanded((v) => !v)} hitSlop={8}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text variant="smallMedium" color={colors.textSoft}>
                      {goalsExpanded ? 'Show top' : 'Show all'}
                    </Text>
                    {goalsExpanded ? (
                      <ChevronUp size={13} color={colors.textSoft} strokeWidth={2} />
                    ) : (
                      <ChevronDown size={13} color={colors.textSoft} strokeWidth={2} />
                    )}
                  </View>
                </Pressable>
              ) : null}
            </View>
            {goalsToShow.map((g) => {
              const rawTint = g.category ? GOAL_CATEGORY_META[g.category].tint : null;
              const tint = resolveTint(rawTint, resolved) ?? colors.surfaceAlt;
              const daysLabel =
                g.daysRemaining === null
                  ? 'No deadline'
                  : g.daysRemaining < 0
                  ? `${Math.abs(g.daysRemaining)} days overdue`
                  : g.daysRemaining === 0
                  ? 'Today is the day'
                  : `${g.daysRemaining} days to go`;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => router.push({ pathname: '/goal/[id]', params: { id: g.id } })}
                  style={({ pressed }) => [
                    styles.goalCard,
                    { backgroundColor: tint },
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text variant="h3" numberOfLines={2}>{g.title}</Text>
                    <Text variant="small" color={colors.textSoft}>{daysLabel}</Text>
                  </View>
                  <ProgressRing progress={g.progress} size={52} strokeWidth={4} label="%" />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* ── Today's tasks ── */}
        <View style={styles.padded}>
          <Card>
            <View style={styles.cardHeader}>
              <Text variant="h3">Today's tasks</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/actions')}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.seeAllBtn,
                  { borderColor: colors.hairline },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text variant="caption" color={colors.textSoft} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  All tasks
                </Text>
                <ArrowRight size={12} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            </View>
            {todayTasks.length === 0 ? (
              <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
                Nothing scheduled. Take a breath.
              </Text>
            ) : (
              <View style={{ gap: spacing.md, marginTop: spacing.md }}>
                {todayTasks.map((t) => (
                  <View key={t.id} style={styles.taskRow}>
                    <Checkbox checked={t.status === 'completed'} onToggle={() => toggleTask(t.id)} size={22} />
                    <Text
                      variant="body"
                      style={{
                        flex: 1,
                        textDecorationLine: t.status === 'completed' ? 'line-through' : 'none',
                        color: t.status === 'completed' ? colors.textMuted : colors.text,
                      }}
                      numberOfLines={1}
                    >
                      {t.title}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>

        {/* ── Pending habits (quick-toggle row) ── */}
        {pendingHabits.length > 0 ? (
          <View style={styles.padded}>
            <Card>
              <View style={styles.cardHeader}>
                <Text variant="h3">
                  Habits{' '}
                  <Text variant="h3" color={colors.textMuted}>
                    {habitsDone}/{habits.length}
                  </Text>
                </Text>
                <Pressable
                  onPress={() => router.push('/(tabs)/actions')}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.seeAllBtn,
                    { borderColor: colors.hairline },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text variant="caption" color={colors.textSoft} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    All habits
                  </Text>
                  <ArrowRight size={12} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
              </View>
              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                {pendingHabits.slice(0, 4).map((h) => (
                  <Pressable
                    key={h.id}
                    onPress={() => toggleHabit(h.id)}
                    style={({ pressed }) => [
                      styles.habitQuickRow,
                      { borderColor: colors.hairline },
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <View
                      style={[
                        styles.habitDot,
                        { borderColor: h.color, backgroundColor: h.color + '22' },
                      ]}
                    />
                    <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                      {h.title}
                    </Text>
                    <View style={[styles.checkCircle, { borderColor: colors.hairline }]} />
                  </Pressable>
                ))}
                {pendingHabits.length > 4 ? (
                  <Text variant="small" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
                    +{pendingHabits.length - 4} more in Actions
                  </Text>
                ) : null}
              </View>
            </Card>
          </View>
        ) : habits.length > 0 ? (
          <View style={styles.padded}>
            <Card tint={colors.butterSoft} flat>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={[styles.allDoneIcon, { backgroundColor: colors.butter + '44' }]}>
                  <Zap size={20} color={colors.text} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3">All habits done</Text>
                  <Text variant="small" color={colors.textSoft} style={{ marginTop: 2 }}>
                    {habits.length} of {habits.length} complete today
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        ) : null}

        {/* ── AI affirmation nudge when mood is low ── */}
        {(todayDiary?.mood === 'low' || todayDiary?.mood === 'bad') ? (
          <View style={styles.padded}>
            <Pressable
              onPress={() => router.push('/affirmations' as any)}
              style={({ pressed }) => [
                styles.affNudge,
                { backgroundColor: '#9B87C011', borderColor: '#9B87C033' },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={{ fontSize: 20 }}>✨</Text>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: '#9B87C0' }}>
                  Generate affirmations for today
                </Text>
                <Text variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>
                  Personalised to what you're going through right now
                </Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* ── On This Day ── */}
        {onThisDay.length > 0 ? (
          <View style={styles.padded}>
            <OnThisDayCard entries={onThisDay} />
          </View>
        ) : null}

        {/* ── Daily reflection ── */}
        <View style={styles.padded}>
          <Card
            tint={todayDiary?.mood ? MOOD_META[todayDiary.mood].tint + '33' : colors.accentSoft}
            flat
          >
            <View style={styles.cardHeader}>
              <Text variant="h3">How was your day?</Text>
              <Pressable onPress={() => router.push('/reflections')} hitSlop={8}>
                <Text variant="smallMedium" color={colors.textSoft}>Past entries</Text>
              </Pressable>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <MoodPicker value={todayDiary?.mood ?? null} onChange={(m) => setDiaryMood(m)} />
            </View>
            <Pressable
              onPress={() => router.push('/diary')}
              style={({ pressed }) => [
                styles.diaryCta,
                { backgroundColor: colors.surface },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Icon icon={NotebookPen} size={18} color={colors.textSoft} />
              <Text variant="body" color={colors.textSoft} style={{ flex: 1 }}>
                {todayDiary?.summary ||
                todayDiary?.good ||
                todayDiary?.bad ||
                todayDiary?.learned ||
                todayDiary?.progress ||
                todayDiary?.happy
                  ? 'Continue your reflection'
                  : 'Open the five gentle prompts'}
              </Text>
              <Icon icon={ArrowRight} size={16} color={colors.textMuted} />
            </Pressable>
          </Card>
        </View>

      </View>
    </Screen>
  );
}

function StatBox({
  label,
  value,
  tint,
  icon,
  sub,
  onPress,
}: {
  label: string;
  value: string;
  tint: string;
  icon?: any;
  sub?: string;
  onPress?: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.stat,
        { backgroundColor: tint },
        pressed && onPress ? { opacity: 0.85 } : null,
      ]}
    >
      <View style={styles.statTop}>
        <Text variant="h1">{value}</Text>
        {icon ? <Icon icon={icon} size={15} color={c.textSoft} /> : null}
      </View>
      <Text variant="caption" color={c.textSoft} style={{ marginTop: 2 }}>
        {label.toUpperCase()}
      </Text>
      {sub ? (
        <Text variant="caption" color={c.textMuted} style={{ marginTop: 1 }}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.xxl },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  profileBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImg: { width: '100%', height: '100%' },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  stat: { flex: 1, borderRadius: radii.lg, padding: spacing.lg },
  statTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginHorizontal: spacing.xxl,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },

  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  habitQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  habitDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5,
  },
  checkCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5,
  },
  allDoneIcon: {
    width: 44, height: 44, borderRadius: radii.xl,
    alignItems: 'center', justifyContent: 'center',
  },

  diaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.lg,
  },

  affNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
});
