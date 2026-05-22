import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Pressable, StyleSheet, Image, FlatList } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  CheckCircle2,
  Flame,
  Target,
  Settings as SettingsIcon,
  Sparkles,
  Pencil,
  Mic,
  ImageIcon as ImageIconLucide,
  Video as VideoIcon,
  ChevronDown,
  ChevronUp,
  Quote as QuoteIcon,
  X as CloseIcon,
  NotebookPen,
  ArrowRight,
} from 'lucide-react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Checkbox } from '@/components/Checkbox';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { ProgressRing } from '@/components/ProgressRing';
import { RotatingGreeting } from '@/components/RotatingGreeting';
import { PlaybackWaveform } from '@/components/Waveform';
import { spacing, radii, useColors, shadows } from '@/theme';
import { SelectionDeleteBtn } from '@/components/SelectionDeleteBtn';
import { ymd } from '@/lib/date';
import { confirm } from '@/lib/confirm';
import { useTasksStore, selectFiltered } from '@/features/tasks/store';
import { useHabitsStore } from '@/features/habits/store';
import { useGoalsStore } from '@/features/goals/store';
import { useProfileStore } from '@/features/profile/store';
import { useJournalStore } from '@/features/journal/store';
import { useDiaryStore } from '@/features/diary/store';
import { GOAL_CATEGORY_META } from '@/features/goals/types';
import { HABIT_ICONS } from '@/features/habits/icons';
import { MoodPicker } from '@/features/diary/MoodPicker';
import { MOOD_META } from '@/features/diary/types';
import { htmlToPlainText } from '@/features/realizations/types';
import type { JournalEntry } from '@/features/journal/types';
import { OnThisDayCard } from '@/components/OnThisDayCard';
import { getOnThisDay, type OnThisDayEntry } from '@/lib/onThisDay';

export default function HomeScreen() {
  const colors = useColors();
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

  const journalEntries = useJournalStore((s) => s.entries);
  const journalStreak = useJournalStore((s) => s.streak);
  const todayJournalCount = useJournalStore((s) => s.todayCount);
  const refreshJournal = useJournalStore((s) => s.refresh);
  const removeManyJournal = useJournalStore((s) => s.removeMany);

  const todayDiary = useDiaryStore((s) => s.today);
  const loadDiary = useDiaryStore((s) => s.loadToday);
  const setDiaryMood = useDiaryStore((s) => s.setMood);

  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [onThisDay, setOnThisDay] = useState<OnThisDayEntry[]>([]);
  const selectionMode = selected.size > 0;

  useFocusEffect(
    useCallback(() => {
      refreshTasks();
      refreshHabits();
      refreshGoals();
      refreshProfile();
      refreshJournal();
      loadDiary();
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

  const todayTasks = useMemo(() => selectFiltered(tasks, 'today').slice(0, 4), [tasks]);
  const completedToday = useMemo(
    () =>
      tasks.filter(
        (t) => t.status === 'completed' && t.completedAt && new Date(t.completedAt).toISOString().slice(0, 10) === ymd(),
      ).length,
    [tasks],
  );
  const habitsDone = habits.filter((h) => h.doneToday).length;

  const initials = profile.name?.trim()
    ? profile.name.trim().split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : null;

  // ─── Journal selection mode helpers
  const enterSelection = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelected(new Set([id]));
  };
  const toggleSel = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const exitSelection = () => setSelected(new Set());
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selected.size} entr${selected.size === 1 ? 'y' : 'ies'}?`,
      message: "This can't be undone.",
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await removeManyJournal(Array.from(selected));
    exitSelection();
  };

  const goalsToShow = goalsExpanded ? sortedGoals : sortedGoals.slice(0, 1);

  const ListHeader = (
    <View style={{ gap: spacing.xxl, paddingTop: spacing.xl }}>
      {/* Greeting + profile */}
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

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox label="Journal streak" value={journalStreak.toString()} tint={colors.accentSoft} sub={`${todayJournalCount} TODAY`} icon={Flame} />
        <StatBox label="Habits today" value={`${habitsDone}/${habits.length || 0}`} tint={colors.butterSoft} />
        <StatBox label="Tasks done" value={completedToday.toString()} tint={colors.peachSoft} />
      </View>

      {/* Goals — toggle */}
      {sortedGoals.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <View style={styles.sectionHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Target size={14} color={colors.textMuted} strokeWidth={1.75} />
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                {activeGoals.length} active goal{activeGoals.length === 1 ? '' : 's'} · avg {avgGoalProgress}%
              </Text>
            </View>
            {sortedGoals.length > 1 ? (
              <Pressable onPress={() => setGoalsExpanded((v) => !v)} hitSlop={8}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text variant="smallMedium" color={colors.textSoft}>
                    {goalsExpanded ? 'Show top' : 'Show all'}
                  </Text>
                  {goalsExpanded ? (
                    <ChevronUp size={14} color={colors.textSoft} strokeWidth={2} />
                  ) : (
                    <ChevronDown size={14} color={colors.textSoft} strokeWidth={2} />
                  )}
                </View>
              </Pressable>
            ) : null}
          </View>
          {goalsToShow.map((g) => {
            const tint = g.category ? GOAL_CATEGORY_META[g.category].tint : colors.surfaceAlt;
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
                <ProgressRing progress={g.progress} size={56} strokeWidth={4} label="%" />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Tasks today */}
      <View style={styles.padded}>
        <Card>
          <View style={styles.cardHeader}>
            <Text variant="h3">Today's tasks</Text>
            <Pressable onPress={() => router.push('/tasks')} hitSlop={8}>
              <Text variant="smallMedium" color={colors.textMuted}>See all</Text>
            </Pressable>
          </View>
          {todayTasks.length === 0 ? (
            <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              Nothing scheduled. Take a breath.
            </Text>
          ) : (
            <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
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

      {/* Habits today */}
      <View style={styles.padded}>
        <Card>
          <View style={styles.cardHeader}>
            <Text variant="h3">Habits</Text>
            <Pressable onPress={() => router.push('/habits')} hitSlop={8}>
              <Text variant="smallMedium" color={colors.textMuted}>See all</Text>
            </Pressable>
          </View>
          {habits.length === 0 ? (
            <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              Add a habit to begin building consistency.
            </Text>
          ) : (
            <View style={styles.habitGrid}>
              {habits.slice(0, 6).map((h) => {
                const I = HABIT_ICONS[h.icon];
                return (
                  <Pressable key={h.id} onPress={() => toggleHabit(h.id)} style={styles.habitPill}>
                    <View
                      style={[
                        styles.habitIcon,
                        {
                          backgroundColor: h.doneToday ? h.color : h.color + '22',
                          borderColor: h.color,
                        },
                      ]}
                    >
                      <I size={18} color={h.doneToday ? colors.bg : h.color} strokeWidth={1.8} />
                    </View>
                    <Text variant="caption" color={colors.textSoft} numberOfLines={1} style={{ maxWidth: 70, marginTop: 6 }}>
                      {h.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>
      </View>

      {/* On This Day */}
      {onThisDay.length > 0 ? (
        <View style={styles.padded}>
          <OnThisDayCard entries={onThisDay} />
        </View>
      ) : null}

      {/* Daily reflection (form-based, prompts + mood) */}
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
              {todayDiary?.summary || todayDiary?.good || todayDiary?.bad || todayDiary?.learned || todayDiary?.progress || todayDiary?.happy
                ? 'Continue your reflection'
                : 'Open the five gentle prompts'}
            </Text>
            <Icon icon={ArrowRight} size={16} color={colors.textMuted} />
          </Pressable>
        </Card>
      </View>

      {/* Journal feed header (free-write) */}
      <View style={[styles.padded, { marginTop: spacing.sm }]}>
        <View style={styles.cardHeader}>
          <Text variant="h2">Free write</Text>
          <Pressable
            onPress={() => router.push('/journal')}
            hitSlop={8}
            style={({ pressed }) => [
              styles.writeBtn,
              { backgroundColor: colors.text },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Pencil size={14} color={colors.bg} strokeWidth={2} />
            <Text variant="smallMedium" color={colors.bg}>Write</Text>
          </Pressable>
        </View>
        <Text variant="body" color={colors.textSoft} style={{ marginTop: spacing.xs }}>
          Whenever a thought comes. Long-press an entry to select.
        </Text>
      </View>
    </View>
  );

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={journalEntries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
              <Sparkles size={28} color={colors.text} strokeWidth={1.6} />
            </View>
            <Text variant="h2" align="center">A blank page</Text>
            <Text variant="body" color={colors.textMuted} align="center" style={{ maxWidth: 280 }}>
              Tap "Write" to begin. There's no right way. A line, a paragraph, a voice note — all of it counts.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.xxl, marginBottom: spacing.md }}>
            <JournalCard
              entry={item}
              selectionMode={selectionMode}
              selected={selected.has(item.id)}
              onPress={() =>
                selectionMode
                  ? toggleSel(item.id)
                  : router.push({ pathname: '/journal', params: { id: item.id } })
              }
              onLongPress={() => enterSelection(item.id)}
            />
          </View>
        )}
      />

      {/* Floating "Write" button */}
      {!selectionMode ? (
        <Pressable
          onPress={() => router.push('/journal')}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.text },
            pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 },
          ]}
          hitSlop={10}
        >
          <Pencil size={22} color={colors.bg} strokeWidth={2} />
        </Pressable>
      ) : null}

      {/* Selection-mode actions */}
      {selectionMode ? (
        <>
          <Pressable
            onPress={exitSelection}
            hitSlop={10}
            style={[
              styles.selCancel,
              { backgroundColor: colors.surface, borderColor: colors.hairline },
            ]}
          >
            <CloseIcon size={18} color={colors.text} strokeWidth={2} />
          </Pressable>
          <SelectionDeleteBtn onPress={bulkDelete} />
        </>
      ) : null}
    </Screen>
  );
}

function JournalCard({
  entry,
  selectionMode,
  selected,
  onPress,
  onLongPress,
}: {
  entry: JournalEntry;
  selectionMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const colors = useColors();
  const previewText = htmlToPlainText(entry.bodyHtml) || entry.content || '';
  const firstImage = entry.attachments.find((a) => a.kind === 'image');
  const firstAudio = entry.attachments.find((a) => a.kind === 'audio');
  const counts = entry.attachments.reduce(
    (acc, a) => ({ ...acc, [a.kind]: (acc[a.kind] ?? 0) + 1 }),
    {} as Record<string, number>,
  );

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.entry,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? colors.text : colors.hairline,
        },
        selected && { backgroundColor: colors.accentSoft },
        pressed && { opacity: 0.92 },
      ]}
    >
      {firstImage ? (
        <Image source={{ uri: firstImage.uri }} style={styles.entryImage} />
      ) : null}
      <View style={styles.entryBody}>
        <View style={styles.entryHead}>
          <Text variant="caption" color={colors.textMuted}>
            {format(entry.createdAt, 'EEE, MMM d · h:mm a').toUpperCase()}
          </Text>
          {selectionMode ? (
            <View style={{ marginLeft: 'auto' }}>
              <View
                style={{
                  width: 22, height: 22, borderRadius: 11,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.text : colors.hairline,
                  backgroundColor: selected ? colors.text : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}
              />
            </View>
          ) : null}
        </View>

        {previewText ? (
          <Text variant="body" numberOfLines={6} style={{ lineHeight: 22 }}>
            {previewText}
          </Text>
        ) : null}

        {firstAudio ? (
          <PlaybackWaveform uri={firstAudio.uri} duration={firstAudio.duration} />
        ) : null}

        {(counts.image ?? 0) + (counts.audio ?? 0) + (counts.video ?? 0) > 0 ? (
          <View style={styles.attRow}>
            {counts.image ? <Badge icon={ImageIconLucide} count={counts.image} /> : null}
            {counts.audio ? <Badge icon={Mic} count={counts.audio} /> : null}
            {counts.video ? <Badge icon={VideoIcon} count={counts.video} /> : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function Badge({ icon: Icon, count }: { icon: any; count: number }) {
  const colors = useColors();
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Icon size={11} color={colors.textMuted} strokeWidth={2} />
      <Text variant="caption" color={colors.textMuted}>{count}</Text>
    </View>
  );
}

function StatBox({ label, value, tint, icon, sub }: { label: string; value: string; tint: string; icon?: any; sub?: string }) {
  const c = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: tint }]}>
      <View style={styles.statTop}>
        <Text variant="h1">{value}</Text>
        {icon ? <Icon icon={icon} size={16} color={c.textSoft} /> : null}
      </View>
      <Text variant="caption" color={c.textSoft} style={{ marginTop: 2 }}>{label.toUpperCase()}</Text>
      {sub ? (
        <Text variant="caption" color={c.textMuted} style={{ marginTop: 2 }}>{sub}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 0, paddingBottom: 200 },
  padded: { paddingHorizontal: spacing.xxl },
  diaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingHorizontal: spacing.xxl },
  profileBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImg: { width: '100%', height: '100%' },
  statsRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xxl },
  stat: { flex: 1, borderRadius: radii.lg, padding: spacing.lg },
  statTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },

  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
  },
  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginHorizontal: spacing.xxl,
  },

  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  habitGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
    marginTop: spacing.md, justifyContent: 'space-between',
  },
  habitPill: { alignItems: 'center', width: '30%' },
  habitIcon: {
    width: 44, height: 44, borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },

  writeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radii.pill,
  },

  entry: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  entryImage: { width: '100%', height: 200 },
  entryBody: { padding: spacing.lg, gap: spacing.sm },
  entryHead: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  attRow: { flexDirection: 'row', gap: spacing.sm },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radii.pill,
  },

  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.huge,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: radii.xxl,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },

  fab: {
    position: 'absolute',
    right: spacing.xxl,
    bottom: 96 + spacing.lg,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.soft,
  },

  selCancel: {
    position: 'absolute',
    left: spacing.xxl,
    bottom: 96 + spacing.lg + 8,
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.soft,
  },
});
