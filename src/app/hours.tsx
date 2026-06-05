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
  type TimeBlock,
} from '@/features/hours/types';
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
  const [nextDaySleepBlocks, setNextDaySleepBlocks] = useState<TimeBlock[]>([]);
  const [categories, setCategories] = useState<HourCategoryRow[]>([]);

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => { if (!date) setDate(ymd()); }, [date, setDate]);

  const loadBlocks = useCallback(async () => {
    if (!date) return;
    const nextDate = ymd(addDays(parseISO(date), 1));
    const [blocks, cats, nextSleep] = await Promise.all([
      hoursRepo.listBlocksForDate(date),
      hoursRepo.listCategories(),
      hoursRepo.listSleepBlocksForDate(nextDate),
    ]);
    setCategories(cats);
    setNextDaySleepBlocks(nextSleep);
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

  // ─── Sleep-aware computed values ───────────────────────────────────────────
  // Hours whose ONLY content is Sleep — these rows are hidden.
  // We check both sources so the row disappears as soon as either data set loads:
  //   • logsByHour (hour_logs)  — loaded by refresh(), arrives fast
  //   • blocksByHour (time_blocks) — loaded by loadBlocks(), arrives shortly after
  const sleepHours = useMemo(() => {
    const set = new Set<number>();
    // From hour_logs — instant once refresh() resolves
    for (const [h, log] of logsByHour) {
      if (log.activity === 'Sleep') set.add(h);
    }
    // From time_blocks — catches hours where blocks are all Sleep
    for (const [h, blocks] of blocksByHour) {
      if (blocks.length > 0 && blocks.every((b) => b.activity === 'Sleep')) {
        set.add(h);
      }
    }
    return set;
  }, [logsByHour, blocksByHour]);

  // Total sleep in minutes — current date blocks + cross-midnight blocks on next date
  const sleepMinutes = useMemo(() => {
    let total = 0;
    for (const [, blocks] of blocksByHour) {
      for (const b of blocks) {
        if (b.activity === 'Sleep') total += b.durationMins;
      }
    }
    for (const b of nextDaySleepBlocks) {
      total += b.durationMins;
    }
    return total;
  }, [blocksByHour, nextDaySleepBlocks]);

  // Sleep session start/end for range display (e.g. "10 PM to 6 AM")
  const sleepSession = useMemo(() => {
    const allSleepBlocks: { startHour: number; startMinute: number; durationMins: number; logDate: string }[] = [];
    for (const [, blocks] of blocksByHour) {
      for (const b of blocks) {
        if (b.activity === 'Sleep') allSleepBlocks.push(b);
      }
    }
    for (const b of nextDaySleepBlocks) {
      allSleepBlocks.push(b);
    }
    if (allSleepBlocks.length === 0) return null;

    // Find earliest start and latest end across all sleep blocks
    let minTotalMins = Infinity;
    let maxTotalMins = -Infinity;
    for (const b of allSleepBlocks) {
      // For next-day blocks, add 1440 (24*60) so they sort after same-day blocks
      const dayOffset = b.logDate !== date ? 1440 : 0;
      const start = b.startHour * 60 + (b.startMinute ?? 0) + dayOffset;
      const end = start + b.durationMins;
      if (start < minTotalMins) minTotalMins = start;
      if (end > maxTotalMins) maxTotalMins = end;
    }
    if (minTotalMins === Infinity) return null;

    const fmtMins = (totalMins: number) => {
      const h = Math.floor(totalMins / 60) % 24;
      const m = totalMins % 60;
      const period = h < 12 ? 'AM' : 'PM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return m > 0 ? `${h12}:${String(m).padStart(2, '0')} ${period}` : `${h12} ${period}`;
    };

    return { startLabel: fmtMins(minTotalMins), endLabel: fmtMins(maxTotalMins) };
  }, [blocksByHour, nextDaySleepBlocks, date]);

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
    const h = Math.floor(sleepMinutes / 60);
    const m = sleepMinutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
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
                    <Text variant="h2">{24 - totalLogged - sleepHours.size}</Text>
                    <Text variant="caption" color={colors.textSoft}>UNTRACKED</Text>
                  </View>
                )}
              </View>

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
                  // Sleep-only hours are collapsed — they don't need a row
                  if (sleepHours.has(hour)) return null;

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
