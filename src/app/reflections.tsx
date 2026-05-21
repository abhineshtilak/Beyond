import React, { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, NotebookPen, Trash2, X as CloseIcon } from 'lucide-react-native';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { colors, spacing, radii } from '@/theme';
import { confirm } from '@/lib/confirm';
import * as repo from '@/features/diary/repo';
import { MOOD_META } from '@/features/diary/types';
import { MoodHeatmap } from '@/features/diary/MoodHeatmap';
import type { DiaryEntry } from '@/features/diary/types';

const PROMPT_LABELS: { key: keyof DiaryEntry; label: string }[] = [
  { key: 'good', label: 'Did well' },
  { key: 'bad', label: 'Avoid next' },
  { key: 'learned', label: 'Learned' },
  { key: 'progress', label: 'Progress' },
  { key: 'happy', label: 'Made me happy' },
];

function dateLabel(d: string) {
  const parsed = parseISO(d);
  if (isToday(parsed)) return 'Today';
  if (isYesterday(parsed)) return 'Yesterday';
  return format(parsed, 'EEEE, MMMM d');
}

export default function ReflectionsScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionMode = selected.size > 0;

  const load = useCallback(async () => {
    const list = await repo.listEntries();
    setEntries(list);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  };

  const toggleExpand = (id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enterSelection = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelected(new Set([id]));
  };

  const toggleSel = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelection = () => setSelected(new Set());

  const selectAll = () => {
    Haptics.selectionAsync().catch(() => {});
    setSelected(new Set(entries.map((e) => e.id)));
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selected.size} reflection${selected.size === 1 ? '' : 's'}?`,
      message: "This can't be undone.",
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    for (const id of selected) {
      await repo.deleteEntry(id);
    }
    exitSelection();
    await load();
  };

  const openEntry = (entry: DiaryEntry) => {
    router.push({ pathname: '/diary', params: { date: entry.entryDate } });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll={false} padded={false} tabBarPadding={false}>
        {selectionMode ? (
          <View style={styles.header}>
            <IconButton icon={CloseIcon} onPress={exitSelection} bg={colors.surface} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                Selection
              </Text>
              <Text variant="h2" style={{ marginTop: 2 }}>
                {selected.size} reflection{selected.size === 1 ? '' : 's'}
              </Text>
            </View>
            <Pressable onPress={selectAll} hitSlop={10} style={styles.selPill}>
              <Text variant="smallMedium" color={colors.textSoft}>
                {selected.size === entries.length && entries.length > 0 ? 'NONE' : 'ALL'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.header}>
            <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                Your journal
              </Text>
              <Text variant="h1" style={{ marginTop: 2 }}>Reflections</Text>
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[styles.list, selectionMode && { paddingBottom: 180 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        >
          {entries.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="No reflections yet"
              message="When you write your first reflection on Home, it will live here."
            />
          ) : (
            <>
              {!selectionMode ? (
                <View style={{ marginBottom: spacing.md }}>
                  <MoodHeatmap entries={entries} weeks={14} />
                </View>
              ) : null}
              {entries.map((entry) => {
                const isOpen = expanded.has(entry.id);
                const isSel = selected.has(entry.id);
                const moodMeta = entry.mood ? MOOD_META[entry.mood] : null;
                const hasContent = !!(entry.summary || entry.good || entry.bad || entry.learned || entry.progress || entry.happy);
                return (
                  <Pressable
                    key={entry.id}
                    onPress={() => {
                      if (selectionMode) toggleSel(entry.id);
                      else if (!hasContent) openEntry(entry);
                      else toggleExpand(entry.id);
                    }}
                    onLongPress={() => enterSelection(entry.id)}
                    delayLongPress={300}
                    style={({ pressed }) => [
                      styles.card,
                      isSel && styles.cardSelected,
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <View style={styles.cardHead}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium">{dateLabel(entry.entryDate)}</Text>
                        <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                          {format(parseISO(entry.entryDate), 'yyyy-MM-dd').toUpperCase()}
                        </Text>
                      </View>
                      {selectionMode ? (
                        <View style={[styles.selDot, isSel && styles.selDotOn]} />
                      ) : moodMeta ? (
                        <View style={[styles.moodChip, { backgroundColor: moodMeta.tint + '55' }]}>
                          <View style={[styles.moodDot, { backgroundColor: moodMeta.tint }]} />
                          <Text variant="caption" color={colors.textSoft}>{moodMeta.label.toUpperCase()}</Text>
                        </View>
                      ) : null}
                    </View>

                    {isOpen && hasContent && !selectionMode ? (
                      <Pressable onPress={() => openEntry(entry)} style={styles.body}>
                        {entry.summary ? (
                          <View style={styles.field}>
                            <Text variant="caption" color={colors.textMuted} style={styles.fieldLabel}>How was your day?</Text>
                            <Text variant="body" color={colors.text}>{entry.summary}</Text>
                          </View>
                        ) : null}
                        {PROMPT_LABELS.map((p) => {
                          const v = entry[p.key] as string | null;
                          if (!v) return null;
                          return (
                            <View key={String(p.key)} style={styles.field}>
                              <Text variant="caption" color={colors.textMuted} style={styles.fieldLabel}>{p.label.toUpperCase()}</Text>
                              <Text variant="body" color={colors.text}>{v}</Text>
                            </View>
                          );
                        })}
                        <Text variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                          TAP TO EDIT
                        </Text>
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })}
            </>
          )}
        </ScrollView>

        {selectionMode ? (
          <View style={styles.actionBar}>
            <Pressable onPress={bulkDelete} style={({ pressed }) => [styles.barBtn, styles.barDanger, pressed && { opacity: 0.8 }]}>
              <Trash2 size={18} color={colors.bg} strokeWidth={1.8} />
              <Text variant="smallMedium" color={colors.bg}>Delete</Text>
            </Pressable>
          </View>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardSelected: {
    borderColor: colors.text,
    backgroundColor: colors.accentSoft,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  moodDot: { width: 8, height: 8, borderRadius: 4 },
  selDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  selDotOn: { backgroundColor: colors.text, borderColor: colors.text },
  selPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  body: {
    marginTop: spacing.lg,
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  field: { gap: 4 },
  fieldLabel: { textTransform: 'uppercase' },
  actionBar: {
    position: 'absolute',
    left: spacing.lg, right: spacing.lg, bottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  barBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  barDanger: { backgroundColor: '#C97B6E' },
});
