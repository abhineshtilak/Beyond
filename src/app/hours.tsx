import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  View, ScrollView, Pressable, StyleSheet,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO, addDays, subDays, isToday } from 'date-fns';
import {
  ChevronLeft, ChevronRight, ChevronLeft as ChevLeft, Moon, Settings2,
} from 'lucide-react-native';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { radii, spacing, useColors } from '@/theme';
import { ymd } from '@/lib/date';
import { useHoursStore } from '@/features/hours/store';
import * as hoursRepo from '@/features/hours/repo';
import {
  HOUR_CATEGORY_META,
  formatHour,
  type HourCategory,
  type HourLog,
  type HourCategoryRow,
  type SleepEntry,
  type TimeBlock,
} from '@/features/hours/types';
import {
  blockedHoursOnPreviousDate,
  blockedHoursOnWakeDate,
  formatSleepDuration,
  formatSleepTime,
} from '@/features/hours/sleepMath';
import { HourEditor, HourEditorRef } from '@/features/hours/HourEditor';
import { SleepSheet, SleepSheetRef } from '@/features/hours/SleepSheet';
import { BlockEditor, BlockEditorRef } from '@/features/hours/BlockEditor';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function HoursScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const date = useHoursStore((s) => s.date);
  const setDate = useHoursStore((s) => s.setDate);
  const logs = useHoursStore((s) => s.logs);
  const refresh = useHoursStore((s) => s.refresh);
  const editorRef = useRef<HourEditorRef>(null);
  const sleepRef = useRef<SleepSheetRef>(null);
  const blockEditorRef = useRef<BlockEditorRef>(null);

  const [view, setView] = useState<'day' | 'week'>('day');
  const [weekData, setWeekData] = useState<{ date: string; logs: HourLog[] }[]>([]);
  const [blocksByHour, setBlocksByHour] = useState<Map<number, TimeBlock[]>>(new Map());
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [nextDaySleepEntries, setNextDaySleepEntries] = useState<SleepEntry[]>([]);
  const [categories, setCategories] = useState<HourCategoryRow[]>([]);

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => { if (!date) setDate(ymd()); }, [date, setDate]);

  const loadBlocks = useCallback(async () => {
    if (!date) return;
    const nextDate = ymd(addDays(parseISO(date), 1));
    const [blocks, cats, currentSleep, nextSleep] = await Promise.all([
      hoursRepo.listBlocksForDate(date),
      hoursRepo.listCategories(),
      hoursRepo.listSleepEntriesForDate(date),
      hoursRepo.listSleepEntriesForDate(nextDate),
    ]);
    setCategories(cats);
    setSleepEntries(currentSleep);
    setNextDaySleepEntries(nextSleep);
    const map = new Map<number, TimeBlock[]>();
    for (const b of blocks) {
      const arr = map.get(b.startHour) ?? [];
      arr.push(b);
      map.set(b.startHour, arr);
    }
    setBlocksByHour(map);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      hoursRepo.weeklySummary().then(setWeekData);
      loadBlocks();
    }, [refresh, date, loadBlocks]),
  );

  const logsByHour = useMemo(() => {
    const m = new Map<number, HourLog>();
    for (const l of logs) m.set(l.hour, l);
    return m;
  }, [logs]);

  // Sleep records are counted only on their wake date. The next wake date is
  // consulted solely to block the previous evening's occupied tracker hours.
  const blockedHours = useMemo(() => {
    const result = new Set<number>();
    for (const entry of sleepEntries) {
      for (const hour of blockedHoursOnWakeDate(entry)) result.add(hour);
    }
    for (const entry of nextDaySleepEntries) {
      for (const hour of blockedHoursOnPreviousDate(entry)) result.add(hour);
    }
    return result;
  }, [sleepEntries, nextDaySleepEntries]);

  // The selected wake date is the only source for this total.
  const sleepMinutes = useMemo(
    () => sleepEntries.reduce((total, entry) => total + entry.durationMins, 0),
    [sleepEntries],
  );

  // Sleep session start/end for range display (e.g. "10 PM to 6 AM")
  const sleepSession = useMemo(() => {
    if (sleepEntries.length !== 1) return null;
    const [entry] = sleepEntries;
    return {
      startLabel: formatSleepTime(entry.sleepHour, entry.sleepMinute),
      endLabel: formatSleepTime(entry.wakeHour, entry.wakeMinute),
    };
  }, [sleepEntries]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const breakdown = useMemo(() => {
    const hasBlocks = blocksByHour.size > 0;
    const out: Record<string, number> = {};
    if (hasBlocks) {
      for (const [, blocks] of blocksByHour) {
        for (const b of blocks) {
          // Exclude Sleep from the activity breakdown (it gets its own summary)
          if (b.category && b.activity !== 'Sleep') {
            out[b.category] = (out[b.category] ?? 0) + Math.ceil(b.durationMins / 60);
          }
        }
      }
    } else {
      for (const l of logs) {
        if (l.category && l.activity !== 'Sleep') {
          out[l.category] = (out[l.category] ?? 0) + 1;
        }
      }
    }
    return out;
  }, [logs, blocksByHour]);

  const getCategoryColor = useCallback((catId: string | null): string => {
    if (!catId) return colors.hairline;
    const custom = categories.find((c) => c.id === catId);
    if (custom) return custom.color;
    return HOUR_CATEGORY_META[catId as HourCategory]?.tint ?? colors.hairline;
  }, [categories, colors.hairline]);

  const getCategoryLabel = useCallback((catId: string | null): string => {
    if (!catId) return '';
    const custom = categories.find((c) => c.id === catId);
    if (custom) return custom.label;
    return HOUR_CATEGORY_META[catId as HourCategory]?.label ?? catId;
  }, [categories]);

  // Count only non-sleep hours for the stats
  const totalLogged = logs.filter((l) => l.activity !== 'Sleep').length;
  const focusedHours = (breakdown.work ?? 0) + (breakdown.learning ?? 0) + (breakdown.creative ?? 0);
  const dateObj = date ? parseISO(date) : new Date();
  const showingToday = isToday(dateObj);

  const goPrev = () => setDate(ymd(subDays(parseISO(date), 1)));
  const goNext = () => setDate(ymd(addDays(parseISO(date), 1)));
  const goToday = () => setDate(ymd());

  const openHour = (hour: number) => {
    blockEditorRef.current?.present(date, hour, () => { refresh(); loadBlocks(); });
  };

  // Sleep summary label (e.g. "8h")
  const sleepLabel = useMemo(() => {
    if (sleepMinutes === 0) return null;
    return formatSleepDuration(sleepMinutes);
  }, [sleepMinutes]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <IconButton icon={ChevLeft} onPress={() => router.back()} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Where the day went
            </Text>
            <Text variant="h1" style={{ marginTop: 2 }}>Hour tracker</Text>
          </View>
          {/* Sleep shortcut */}
          <Pressable
            onPress={() => sleepRef.current?.present(date, () => { refresh(); loadBlocks(); })}
            style={({ pressed }) => [
              styles.headerBtn,
              { backgroundColor: colors.surface, borderColor: colors.hairline },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Moon size={15} color={colors.textSoft} strokeWidth={1.75} />
            <Text variant="smallMedium" color={colors.textSoft}>Sleep</Text>
          </Pressable>
          {/* Categories */}
          <Pressable
            onPress={() => router.push('/hour-categories')}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: colors.surface, borderColor: colors.hairline },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Settings2 size={16} color={colors.textSoft} strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* ── Day nav ─────────────────────────────────────────────────────── */}
        <View style={styles.dayNav}>
          <Pressable
            onPress={goPrev}
            hitSlop={8}
            style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
          >
            <ChevronLeft size={18} color={colors.text} strokeWidth={1.75} />
          </Pressable>
          <Pressable onPress={goToday} style={{ alignItems: 'center', flex: 1 }}>
            <Text variant="bodyMedium">{format(dateObj, 'EEEE, MMMM d')}</Text>
            <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
              {showingToday ? 'TODAY' : 'TAP TO RETURN TODAY'}
            </Text>
          </Pressable>
          <Pressable
            onPress={goNext}
            hitSlop={8}
            style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
          >
            <ChevronRight size={18} color={colors.text} strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* ── View toggle ─────────────────────────────────────────────────── */}
        <View style={styles.toggleRow}>
          {(['day', 'week'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={[
                styles.toggleBtn,
                { backgroundColor: colors.surface, borderColor: colors.hairline },
                view === v && { backgroundColor: colors.text, borderColor: colors.text },
              ]}
            >
              <Text variant="smallMedium" color={view === v ? colors.bg : colors.text}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Main scroll ─────────────────────────────────────────────────── */}
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
                <View style={[styles.stat, { backgroundColor: colors.lavenderSoft }]}>
                  <Text variant="h2">{focusedHours}</Text>
                  <Text variant="caption" color={colors.textSoft}>DEEP HOURS</Text>
                </View>
                {sleepLabel ? (
                  <View style={[styles.stat, { backgroundColor: colors.surfaceAlt }]}>
                    <Text variant="h2">{sleepLabel}</Text>
                    <Text variant="caption" color={colors.textSoft}>SLEEP</Text>
                    {sleepSession ? (
                      <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                        {sleepSession.startLabel}–{sleepSession.endLabel}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={[styles.stat, { backgroundColor: colors.butterSoft }]}>
                    <Text variant="h2">
                      {Math.max(0, 24 - totalLogged - blockedHours.size)}
                    </Text>
                    <Text variant="caption" color={colors.textSoft}>UNTRACKED</Text>
                  </View>
                )}
              </View>

              {sleepEntries.length > 0 ? (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.hairline },
                  ]}
                >
                  <View style={styles.sleepCardHeader}>
                    <View>
                      <Text
                        variant="caption"
                        color={colors.textMuted}
                        style={{ textTransform: 'uppercase' }}
                      >
                        Sleep entries
                      </Text>
                      <Text variant="small" color={colors.textFaint}>
                        Counted only on this wake-up date
                      </Text>
                    </View>
                    <Text variant="smallMedium" color={colors.textSoft}>
                      {sleepEntries.length}
                    </Text>
                  </View>
                  {sleepEntries.map((entry) => (
                    <Pressable
                      key={entry.id}
                      onPress={() => {
                        sleepRef.current?.present(
                          date,
                          () => { refresh(); loadBlocks(); },
                          entry,
                        );
                      }}
                      style={({ pressed }) => [
                        styles.sleepEntryRow,
                        { borderTopColor: colors.hairline },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View
                        style={[
                          styles.sleepEntryIcon,
                          { backgroundColor: colors.lavenderSoft },
                        ]}
                      >
                        <Moon
                          size={16}
                          color={colors.lavender}
                          strokeWidth={1.75}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium">
                          {formatSleepTime(entry.sleepHour, entry.sleepMinute)}
                          {' to '}
                          {formatSleepTime(entry.wakeHour, entry.wakeMinute)}
                        </Text>
                        <Text variant="caption" color={colors.textMuted}>
                          {formatSleepDuration(entry.durationMins)}
                        </Text>
                      </View>
                      <ChevronRight
                        size={16}
                        color={colors.textMuted}
                        strokeWidth={1.75}
                      />
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {/* Category breakdown */}
              {Object.keys(breakdown).length > 0 ? (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                  <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                    Breakdown
                  </Text>
                  <View style={styles.legendGrid}>
                    {Object.entries(breakdown).map(([cat, count]) => (
                      <View key={cat} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: getCategoryColor(cat) }]} />
                        <Text variant="caption" color={colors.textSoft}>{getCategoryLabel(cat)}</Text>
                        <Text variant="caption" color={colors.textMuted}>· {count}h</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* 24-hour grid — sleep hours are hidden */}
              <View style={styles.timeline}>
                {HOURS.map((hour) => {
                  // Occupied sleep hours are blocked from manual hour logging.
                  if (blockedHours.has(hour)) return null;

                  const log = logsByHour.get(hour);
                  const blocks = blocksByHour.get(hour) ?? [];
                  const hasBlocks = blocks.length > 0;
                  const filled = !!log;
                  // Primary category color — used as accent, NOT as full background
                  const catColor = hasBlocks
                    ? getCategoryColor(blocks[0]?.category ?? null)
                    : log?.category
                    ? getCategoryColor(log.category)
                    : null;

                  return (
                    <Pressable
                      key={hour}
                      onPress={() => openHour(hour)}
                      style={({ pressed }) => [
                        styles.hourRow,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text
                        variant="caption"
                        color={colors.textMuted}
                        style={styles.hourLabel}
                      >
                        {formatHour(hour)}
                      </Text>
                      <View
                        style={[
                          styles.hourBlock,
                          {
                            // Surface background always — text is always readable
                            backgroundColor: colors.surface,
                            borderColor: catColor ? catColor + '70' : colors.hairline,
                          },
                        ]}
                      >
                        {hasBlocks ? (
                          <View style={{ flex: 1 }}>
                            {/* Proportional color strips showing each block */}
                            <View style={styles.blockStrips}>
                              {blocks.map((b) => (
                                <View
                                  key={b.id}
                                  style={[
                                    styles.blockStrip,
                                    { flex: b.durationMins, backgroundColor: getCategoryColor(b.category) },
                                  ]}
                                />
                              ))}
                              {/* Grey remainder — only shown when total < 60, never negative */}
                              {(() => {
                                const used = blocks.reduce((s, b) => s + b.durationMins, 0);
                                const rem  = Math.max(0, 60 - used);
                                return rem > 0 ? (
                                  <View style={[styles.blockStrip, { flex: rem, backgroundColor: colors.hairline }]} />
                                ) : null;
                              })()}
                            </View>
                            <Text
                              variant="caption"
                              color={colors.textSoft}
                              style={{ marginTop: 4 }}
                              numberOfLines={1}
                            >
                              {blocks.map((b) => b.activity).join(' · ')}
                            </Text>
                          </View>
                        ) : filled ? (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            {catColor ? (
                              <View style={[styles.catDot, { backgroundColor: catColor }]} />
                            ) : null}
                            <View style={{ flex: 1 }}>
                              <Text variant="body" numberOfLines={1}>{log!.activity}</Text>
                              {log!.category ? (
                                <Text variant="caption" color={colors.textMuted} style={{ marginTop: 1 }}>
                                  {getCategoryLabel(log!.category)}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ) : (
                          <Text variant="body" color={colors.textFaint}>tap to log</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={[styles.reflectCard, { backgroundColor: colors.accentSoft }]}>
                <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                  Reflect
                </Text>
                <Text variant="body" color={colors.textSoft} style={{ marginTop: 4 }}>
                  Was this how you wanted to spend your day? What would you change tomorrow?
                </Text>
              </View>
            </>
          ) : (
            <WeekView
              weekData={weekData}
              onPickDate={(d) => { setDate(d); setView('day'); }}
              getCatColor={getCategoryColor}
              getCatLabel={getCategoryLabel}
            />
          )}
        </ScrollView>

        <HourEditor ref={editorRef} />
        <SleepSheet ref={sleepRef} />
        <BlockEditor ref={blockEditorRef} />
      </SafeAreaView>
    </>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  weekData,
  onPickDate,
  getCatColor,
  getCatLabel,
}: {
  weekData: { date: string; logs: HourLog[] }[];
  onPickDate: (date: string) => void;
  getCatColor: (cat: string | null) => string;
  getCatLabel: (cat: string | null) => string;
}) {
  const colors = useColors();
  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const d of weekData) {
      for (const l of d.logs) {
        if (l.category && l.activity !== 'Sleep') out[l.category] = (out[l.category] ?? 0) + 1;
      }
    }
    return out;
  }, [weekData]);

  const totalHours = Object.values(totals).reduce((s, v) => s + v, 0);

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
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
              const pct = Math.round((count / totalHours) * 100);
              return (
                <View key={cat} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: getCatColor(cat) }]} />
                  <Text variant="caption" color={colors.textSoft}>{getCatLabel(cat)}</Text>
                  <Text variant="caption" color={colors.textMuted}>· {count}h · {pct}%</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.weekGrid}>
        {weekData.map((day) => {
          const byHour = new Map<number, HourLog>();
          for (const l of day.logs) byHour.set(l.hour, l);
          return (
            <Pressable key={day.date} onPress={() => onPickDate(day.date)} style={styles.weekDay}>
              <Text variant="caption" color={colors.textMuted}>
                {format(parseISO(day.date), 'EEE').toUpperCase()}
              </Text>
              <Text variant="smallMedium" color={isToday(parseISO(day.date)) ? colors.text : colors.textSoft}>
                {format(parseISO(day.date), 'd')}
              </Text>
              <View style={styles.weekColumn}>
                {HOURS.map((h) => {
                  const log = byHour.get(h);
                  return (
                    <View
                      key={h}
                      style={[
                        styles.weekCell,
                        { backgroundColor: log ? getCatColor(log.category) : colors.surfaceAlt },
                      ]}
                    />
                  );
                })}
              </View>
              <Text variant="caption" color={colors.textMuted}>
                {day.logs.filter((l) => l.activity !== 'Sleep').length}h
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.md,
  },
  toggleBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  scroll: { paddingHorizontal: spacing.xxl, gap: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, padding: spacing.lg, borderRadius: radii.lg, gap: 2 },
  card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  sleepCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sleepEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  sleepEntryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  timeline: { gap: 4 },
  hourRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  hourLabel: { width: 52, textAlign: 'right', paddingTop: spacing.md },
  hourBlock: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 50,
    justifyContent: 'center',
  },
  blockStrips: {
    flexDirection: 'row',
    height: 6,
    borderRadius: radii.sm,
    overflow: 'hidden',
    gap: 1,
  },
  blockStrip: { height: '100%' },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  reflectCard: { borderRadius: radii.lg, padding: spacing.lg, marginTop: spacing.md },
  weekGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  weekDay: { flex: 1, alignItems: 'center', gap: 6 },
  weekColumn: { width: '90%', gap: 1, marginVertical: 4 },
  weekCell: { height: 5, borderRadius: 1 },
});
