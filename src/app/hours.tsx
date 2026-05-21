import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO, addDays, subDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronLeft as ChevLeft, Clock } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { colors, radii, spacing } from '@/theme';
import { ymd } from '@/lib/date';
import { useHoursStore } from '@/features/hours/store';
import * as hoursRepo from '@/features/hours/repo';
import { HOUR_CATEGORY_META, formatHour, type HourCategory, type HourLog } from '@/features/hours/types';
import { HourEditor, HourEditorRef } from '@/features/hours/HourEditor';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function HoursScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const date = useHoursStore((s) => s.date);
  const setDate = useHoursStore((s) => s.setDate);
  const logs = useHoursStore((s) => s.logs);
  const refresh = useHoursStore((s) => s.refresh);
  const editorRef = useRef<HourEditorRef>(null);

  const [view, setView] = useState<'day' | 'week'>('day');
  const [weekData, setWeekData] = useState<{ date: string; logs: HourLog[] }[]>([]);

  // Initialize date once
  useEffect(() => {
    if (!date) setDate(ymd());
  }, [date, setDate]);

  useFocusEffect(
    React.useCallback(() => {
      refresh();
      hoursRepo.weeklySummary().then(setWeekData);
    }, [refresh, date])
  );

  const logsByHour = useMemo(() => {
    const m = new Map<number, HourLog>();
    for (const l of logs) m.set(l.hour, l);
    return m;
  }, [logs]);

  const breakdown = useMemo(() => {
    const out: Record<string, number> = {};
    for (const l of logs) {
      if (l.category) out[l.category] = (out[l.category] ?? 0) + 1;
    }
    return out;
  }, [logs]);

  const totalLogged = logs.length;
  const focusedHours = (breakdown.work ?? 0) + (breakdown.learning ?? 0) + (breakdown.creative ?? 0);

  const goPrev = () => setDate(ymd(subDays(parseISO(date), 1)));
  const goNext = () => setDate(ymd(addDays(parseISO(date), 1)));
  const goToday = () => setDate(ymd());

  const openHour = (hour: number) => {
    const existing = logsByHour.get(hour);
    editorRef.current?.present(hour, existing?.activity, existing?.category);
  };

  const dateObj = date ? parseISO(date) : new Date();
  const showingToday = isToday(dateObj);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={ChevLeft} onPress={() => router.back()} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Where the day went
            </Text>
            <Text variant="h1" style={{ marginTop: 2 }}>Hour tracker</Text>
          </View>
        </View>

        {/* Day nav */}
        <View style={styles.dayNav}>
          <Pressable onPress={goPrev} hitSlop={8} style={styles.navBtn}>
            <ChevronLeft size={18} color={colors.text} strokeWidth={1.75} />
          </Pressable>
          <Pressable onPress={goToday} style={{ alignItems: 'center', flex: 1 }}>
            <Text variant="bodyMedium">{format(dateObj, 'EEEE, MMMM d')}</Text>
            {!showingToday ? (
              <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>TAP TO RETURN TODAY</Text>
            ) : (
              <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>TODAY</Text>
            )}
          </Pressable>
          <Pressable onPress={goNext} hitSlop={8} style={styles.navBtn}>
            <ChevronRight size={18} color={colors.text} strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* View toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setView('day')}
            style={[styles.toggleBtn, view === 'day' && styles.toggleBtnOn]}
          >
            <Text variant="smallMedium" color={view === 'day' ? colors.bg : colors.text}>Day</Text>
          </Pressable>
          <Pressable
            onPress={() => setView('week')}
            style={[styles.toggleBtn, view === 'week' && styles.toggleBtnOn]}
          >
            <Text variant="smallMedium" color={view === 'week' ? colors.bg : colors.text}>Week</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 80 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {view === 'day' ? (
            <>
              {/* Quick stats */}
              <View style={styles.statsRow}>
                <View style={[styles.stat, { backgroundColor: colors.accentSoft }]}>
                  <Text variant="h2">{totalLogged}</Text>
                  <Text variant="caption" color={colors.textSoft}>HOURS LOGGED</Text>
                </View>
                <View style={[styles.stat, { backgroundColor: '#DEE8EF' }]}>
                  <Text variant="h2">{focusedHours}</Text>
                  <Text variant="caption" color={colors.textSoft}>DEEP HOURS</Text>
                </View>
                <View style={[styles.stat, { backgroundColor: '#F7E3D9' }]}>
                  <Text variant="h2">{24 - totalLogged}</Text>
                  <Text variant="caption" color={colors.textSoft}>UNTRACKED</Text>
                </View>
              </View>

              {/* Category breakdown */}
              {Object.keys(breakdown).length > 0 ? (
                <View style={styles.card}>
                  <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                    Breakdown
                  </Text>
                  <View style={styles.legendGrid}>
                    {Object.entries(breakdown).map(([cat, count]) => {
                      const meta = HOUR_CATEGORY_META[cat as HourCategory];
                      return (
                        <View key={cat} style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: meta.tint }]} />
                          <Text variant="caption" color={colors.textSoft}>{meta.label}</Text>
                          <Text variant="caption" color={colors.textMuted}>· {count}h</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {/* 24-hour grid */}
              <View style={styles.timeline}>
                {HOURS.map((hour) => {
                  const log = logsByHour.get(hour);
                  const meta = log?.category ? HOUR_CATEGORY_META[log.category] : null;
                  const filled = !!log;
                  return (
                    <Pressable
                      key={hour}
                      onPress={() => openHour(hour)}
                      style={({ pressed }) => [
                        styles.hourRow,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text variant="caption" color={colors.textMuted} style={styles.hourLabel}>
                        {formatHour(hour)}
                      </Text>
                      <View style={[styles.hourBlock, filled && meta && { backgroundColor: meta.tint }]}>
                        {filled ? (
                          <View style={{ flex: 1 }}>
                            <Text variant="body" numberOfLines={1}>{log!.activity}</Text>
                            {meta ? (
                              <Text variant="caption" color={colors.textSoft} style={{ marginTop: 2 }}>
                                {meta.label.toUpperCase()}
                              </Text>
                            ) : null}
                          </View>
                        ) : (
                          <Text variant="body" color={colors.textFaint}>tap to log</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.reflectCard}>
                <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                  Reflect
                </Text>
                <Text variant="body" color={colors.textSoft} style={{ marginTop: 4 }}>
                  Was this how you wanted to spend your day? What would you change tomorrow?
                </Text>
              </View>
            </>
          ) : (
            <WeekView weekData={weekData} onPickDate={(d) => { setDate(d); setView('day'); }} />
          )}
        </ScrollView>

        <HourEditor ref={editorRef} />
      </SafeAreaView>
    </>
  );
}

function WeekView({
  weekData,
  onPickDate,
}: {
  weekData: { date: string; logs: HourLog[] }[];
  onPickDate: (date: string) => void;
}) {
  // Aggregate by category for the week
  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const d of weekData) {
      for (const l of d.logs) {
        if (l.category) out[l.category] = (out[l.category] ?? 0) + 1;
      }
    }
    return out;
  }, [weekData]);

  const totalHours = Object.values(totals).reduce((s, v) => s + v, 0);

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.card}>
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
          This week · {totalHours}h tracked
        </Text>
        {totalHours === 0 ? (
          <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
            Log a few hours to see your week shape up here.
          </Text>
        ) : (
          <View style={styles.legendGrid}>
            {Object.entries(totals).map(([cat, count]) => {
              const meta = HOUR_CATEGORY_META[cat as HourCategory];
              const pct = Math.round((count / totalHours) * 100);
              return (
                <View key={cat} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: meta.tint }]} />
                  <Text variant="caption" color={colors.textSoft}>{meta.label}</Text>
                  <Text variant="caption" color={colors.textMuted}>· {count}h · {pct}%</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Per-day grid */}
      <View style={styles.weekGrid}>
        {weekData.map((day) => {
          const logsByHour = new Map<number, HourLog>();
          for (const l of day.logs) logsByHour.set(l.hour, l);
          return (
            <Pressable
              key={day.date}
              onPress={() => onPickDate(day.date)}
              style={styles.weekDay}
            >
              <Text variant="caption" color={colors.textMuted}>
                {format(parseISO(day.date), 'EEE').toUpperCase()}
              </Text>
              <Text variant="smallMedium" color={isToday(parseISO(day.date)) ? colors.text : colors.textSoft}>
                {format(parseISO(day.date), 'd')}
              </Text>
              <View style={styles.weekColumn}>
                {HOURS.map((h) => {
                  const log = logsByHour.get(h);
                  const meta = log?.category ? HOUR_CATEGORY_META[log.category] : null;
                  return (
                    <View
                      key={h}
                      style={[
                        styles.weekCell,
                        log ? { backgroundColor: meta?.tint ?? colors.hairline } : { backgroundColor: colors.surfaceAlt },
                      ]}
                    />
                  );
                })}
              </View>
              <Text variant="caption" color={colors.textMuted}>
                {day.logs.length}h
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  dayNav: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.sm,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, borderColor: colors.hairline, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.xxl, paddingBottom: spacing.md,
  },
  toggleBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderColor: colors.hairline, borderWidth: 1,
  },
  toggleBtnOn: { backgroundColor: colors.text, borderColor: colors.text },
  scroll: { paddingHorizontal: spacing.xxl, gap: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, padding: spacing.lg, borderRadius: radii.lg, gap: 2 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline, borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg, gap: spacing.sm,
  },
  legendGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  timeline: { gap: 4 },
  hourRow: {
    flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm,
  },
  hourLabel: {
    width: 52, textAlign: 'right', paddingTop: spacing.md,
  },
  hourBlock: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.hairline, borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    minHeight: 50,
    justifyContent: 'center',
  },
  reflectCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  weekGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  weekDay: { flex: 1, alignItems: 'center', gap: 6 },
  weekColumn: { width: '90%', gap: 1, marginVertical: 4 },
  weekCell: { height: 5, borderRadius: 1 },
});
