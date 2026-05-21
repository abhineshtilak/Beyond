import React, { useCallback, useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Pencil, Flame, Target, Bell, Trash2, Check, Calendar as CalIcon } from 'lucide-react-native';
import { format, parseISO, subDays, eachDayOfInterval } from 'date-fns';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { colors, radii, spacing, palette } from '@/theme';
import { ymd } from '@/lib/date';
import { confirm } from '@/lib/confirm';
import * as habitsRepo from '@/features/habits/repo';
import { HABIT_ICONS } from '@/features/habits/icons';
import { HabitHeatmap } from '@/features/habits/HabitHeatmap';
import { useHabitsStore } from '@/features/habits/store';
import { HabitEditor, HabitEditorRef } from '@/features/habits/HabitEditor';
import type { HabitWithStats } from '@/features/habits/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HabitDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const refreshList = useHabitsStore((s) => s.refresh);
  const habits = useHabitsStore((s) => s.habits);

  const [habit, setHabit] = useState<HabitWithStats | null>(null);
  const editorRef = useRef<HabitEditorRef>(null);

  const load = useCallback(async () => {
    const list = await habitsRepo.listWithStats();
    const h = list.find((x) => x.id === id) ?? null;
    setHabit(h);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load, habits]));

  if (!habit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
        </View>
      </SafeAreaView>
    );
  }

  const Icon = HABIT_ICONS[habit.icon];
  const today = ymd();

  const toggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await habitsRepo.toggleCheckIn(id);
    await load();
    refreshList();
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete habit',
      message: `Remove "${habit.title}" and all its history?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await habitsRepo.deleteHabit(habit.id);
    await refreshList();
    router.back();
  };

  // Build last 7 days strip
  const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });

  const reminderDays = habit.reminderDays ? habit.reminderDays.split(',').map(Number) : [];
  const reminderLabel = (() => {
    if (!habit.reminderTime) return null;
    if (reminderDays.length === 7) return `Every day at ${habit.reminderTime}`;
    if (reminderDays.length === 0) return `${habit.reminderTime}`;
    if (reminderDays.length === 5 && [1, 2, 3, 4, 5].every((d) => reminderDays.includes(d))) return `Weekdays at ${habit.reminderTime}`;
    if (reminderDays.length === 2 && reminderDays.includes(0) && reminderDays.includes(6)) return `Weekends at ${habit.reminderTime}`;
    const days = reminderDays.map((d) => DAY_NAMES[d]).join(', ');
    return `${days} at ${habit.reminderTime}`;
  })();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
          <View style={{ flex: 1 }} />
          <IconButton
            icon={Pencil}
            onPress={() => editorRef.current?.present(habit)}
            bg={colors.surface}
          />
        </View>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 80 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO */}
          <View style={[styles.hero, { backgroundColor: habit.color + '22' }]}>
            <View style={[styles.iconWrap, { backgroundColor: habit.color + '55' }]}>
              <Icon size={36} color={habit.color} strokeWidth={1.6} />
            </View>
            <Text variant="display" align="center" style={{ marginTop: spacing.lg }}>{habit.title}</Text>
            {reminderLabel ? (
              <View style={styles.reminderChip}>
                <Bell size={12} color={colors.textSoft} strokeWidth={1.75} />
                <Text variant="caption" color={colors.textSoft}>{reminderLabel.toUpperCase()}</Text>
              </View>
            ) : null}
          </View>

          {/* TODAY CHECK-IN */}
          <View style={styles.todayCard}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                Today
              </Text>
              <Text variant="h2" style={{ marginTop: 4 }}>
                {habit.doneToday ? 'Done. Well done.' : 'Not yet today.'}
              </Text>
            </View>
            <Pressable
              onPress={toggle}
              style={[
                styles.checkBtn,
                habit.doneToday && { backgroundColor: habit.color, borderColor: habit.color },
              ]}
            >
              <Check size={20} color={habit.doneToday ? colors.bg : colors.text} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* LAST 7 DAYS */}
          <View style={styles.card}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Last 7 days
            </Text>
            <View style={styles.weekStrip}>
              {last7.map((d) => {
                const key = ymd(d);
                const isDone = habit.doneDates.has(key);
                const isToday = key === today;
                return (
                  <View key={key} style={styles.dayCol}>
                    <Text variant="caption" color={isToday ? colors.text : colors.textMuted}>
                      {format(d, 'EEE').toUpperCase()}
                    </Text>
                    <View
                      style={[
                        styles.dayDot,
                        {
                          backgroundColor: isDone ? habit.color : colors.hairline,
                          borderColor: isToday ? colors.text : 'transparent',
                        },
                      ]}
                    >
                      {isDone ? <Check size={14} color={colors.bg} strokeWidth={3} /> : null}
                    </View>
                    <Text variant="caption" color={colors.textFaint}>
                      {format(d, 'd')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* STATS ROW */}
          <View style={styles.statsRow}>
            <View style={[styles.stat, { backgroundColor: habit.color + '22' }]}>
              <View style={styles.statTop}>
                <Text variant="h1">{habit.streak}</Text>
                <Flame size={16} color={colors.textSoft} strokeWidth={2} />
              </View>
              <Text variant="caption" color={colors.textSoft} style={{ marginTop: 2 }}>STREAK</Text>
            </View>
            <View style={[styles.stat, { backgroundColor: palette.creamSoft }]}>
              <Text variant="h1">{habit.successRate}%</Text>
              <Text variant="caption" color={colors.textSoft} style={{ marginTop: 2 }}>
                {habit.targetDays} DAY RATE
              </Text>
            </View>
            <View style={[styles.stat, { backgroundColor: palette.skySoft }]}>
              <Text variant="h1">{habit.doneDates.size}</Text>
              <Text variant="caption" color={colors.textSoft} style={{ marginTop: 2 }}>TOTAL CHECK-INS</Text>
            </View>
          </View>

          {/* HEATMAP */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
              <CalIcon size={14} color={colors.textMuted} strokeWidth={1.75} />
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                Consistency map
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HabitHeatmap doneDates={habit.doneDates} color={habit.color} weeks={22} />
            </ScrollView>
            <Text variant="small" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              Each square is a day. Filled means you showed up. Small steps, every day, compound.
            </Text>
          </View>

          {/* DELETE */}
          <Pressable onPress={handleDelete} style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}>
            <Trash2 size={16} color="#B97A6B" strokeWidth={1.75} />
            <Text variant="bodyMedium" color="#B97A6B">Delete habit</Text>
          </Pressable>
        </ScrollView>
        <HabitEditor ref={editorRef} />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md, gap: spacing.lg },
  hero: {
    borderRadius: radii.xxl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  checkBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  dayCol: { alignItems: 'center', gap: 6, flex: 1 },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, padding: spacing.lg, borderRadius: radii.lg },
  statTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#E8D0CB',
    backgroundColor: '#F7E9E5',
  },
});
