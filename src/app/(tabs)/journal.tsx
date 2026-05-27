import React, { useCallback, useState } from 'react';
import { View, Pressable, StyleSheet, Image, FlatList } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Sparkles, Pencil, Mic, Image as ImageIconLucide, Video as VideoIcon, Flame, X as CloseIcon } from 'lucide-react-native';
import * as Haptics from '@/lib/haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { SelectionDeleteBtn } from '@/components/SelectionDeleteBtn';
import { PlaybackWaveform } from '@/components/Waveform';
import { spacing, radii, useColors, shadows } from '@/theme';
import { confirm } from '@/lib/confirm';
import { useJournalStore } from '@/features/journal/store';
import { htmlToPlainText } from '@/features/realizations/types';
import type { JournalEntry } from '@/features/journal/types';

export default function JournalTab() {
  const colors = useColors();
  const router = useRouter();

  const entries = useJournalStore((s) => s.entries);
  const streak = useJournalStore((s) => s.streak);
  const todayCount = useJournalStore((s) => s.todayCount);
  const refresh = useJournalStore((s) => s.refresh);
  const removeMany = useJournalStore((s) => s.removeMany);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionMode = selected.size > 0;

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

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
    await removeMany(Array.from(selected));
    exitSelection();
  };

  const ListHeader = (
    <View style={styles.header}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text variant="display">Journal</Text>
        </View>
        <Pressable
          onPress={() => router.push('/journal')}
          style={({ pressed }) => [
            styles.writeBtn,
            { backgroundColor: colors.text },
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
          hitSlop={8}
        >
          <Pencil size={15} color={colors.bg} strokeWidth={2} />
          <Text variant="smallMedium" color={colors.bg}>Write</Text>
        </Pressable>
      </View>

      {/* Streak + today count */}
      {streak > 0 || todayCount > 0 ? (
        <View style={styles.statsRow}>
          {streak > 0 ? (
            <View style={[styles.statPill, { backgroundColor: colors.butterSoft }]}>
              <Flame size={13} color={colors.textSoft} strokeWidth={2} />
              <Text variant="caption" color={colors.textSoft}>
                {streak} day streak
              </Text>
            </View>
          ) : null}
          {todayCount > 0 ? (
            <View style={[styles.statPill, { backgroundColor: colors.accentSoft }]}>
              <Text variant="caption" color={colors.textSoft}>
                {todayCount} {todayCount === 1 ? 'entry' : 'entries'} today
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Hint */}
      {entries.length > 0 ? (
        <Text variant="small" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Long-press an entry to select.
        </Text>
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
              <Sparkles size={30} color={colors.text} strokeWidth={1.6} />
            </View>
            <Text variant="h2" align="center">A blank page</Text>
            <Text variant="body" color={colors.textMuted} align="center" style={{ maxWidth: 280, lineHeight: 22 }}>
              Tap "Write" to begin. A line, a paragraph, a voice note — all of it counts.
            </Text>
            <Pressable
              onPress={() => router.push('/journal')}
              style={({ pressed }) => [
                styles.emptyWriteBtn,
                { backgroundColor: colors.text },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Pencil size={16} color={colors.bg} strokeWidth={2} />
              <Text variant="body" color={colors.bg}>Start writing</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.entryWrap}>
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

      {/* Floating Write FAB */}
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

      {/* Selection mode controls */}
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
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? colors.text : colors.hairline,
        },
        selected && { backgroundColor: colors.accentSoft },
        pressed && { opacity: 0.92 },
      ]}
    >
      {firstImage ? (
        <Image source={{ uri: firstImage.uri }} style={styles.cardImage} />
      ) : null}
      <View style={styles.cardBody}>
        <View style={styles.cardHead}>
          <Text variant="caption" color={colors.textMuted}>
            {format(entry.createdAt, 'EEE, MMM d · h:mm a').toUpperCase()}
          </Text>
          {selectionMode ? (
            <View
              style={{
                width: 22, height: 22, borderRadius: 11,
                borderWidth: 1.5,
                borderColor: selected ? colors.text : colors.hairline,
                backgroundColor: selected ? colors.text : 'transparent',
                alignItems: 'center', justifyContent: 'center',
                marginLeft: 'auto',
              }}
            />
          ) : null}
        </View>

        {entry.title ? (
          <Text variant="h3" numberOfLines={2} style={{ marginBottom: previewText ? 4 : 0 }}>
            {entry.title}
          </Text>
        ) : null}

        {previewText ? (
          <Text
            variant="body"
            numberOfLines={entry.title ? 3 : 6}
            color={entry.title ? colors.textSoft : colors.text}
            style={{ lineHeight: 22 }}
          >
            {previewText}
          </Text>
        ) : null}

        {firstAudio ? (
          <PlaybackWaveform uri={firstAudio.uri} duration={firstAudio.duration} />
        ) : null}

        {(counts.image ?? 0) + (counts.audio ?? 0) + (counts.video ?? 0) > 0 ? (
          <View style={styles.attRow}>
            {counts.image ? <AttachBadge icon={ImageIconLucide} count={counts.image} /> : null}
            {counts.audio ? <AttachBadge icon={Mic} count={counts.audio} /> : null}
            {counts.video ? <AttachBadge icon={VideoIcon} count={counts.video} /> : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function AttachBadge({ icon: Icon, count }: { icon: any; count: number }) {
  const colors = useColors();
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Icon size={11} color={colors.textMuted} strokeWidth={2} />
      <Text variant="caption" color={colors.textMuted}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 200 },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  writeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.lg, paddingVertical: 9,
    borderRadius: radii.pill,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radii.pill,
  },

  entryWrap: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 200 },
  cardBody: { padding: spacing.lg, gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  attRow: { flexDirection: 'row', gap: spacing.sm },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radii.pill,
  },

  empty: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.huge,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: radii.xxl,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyWriteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg,
    borderRadius: radii.pill,
    marginTop: spacing.md,
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
