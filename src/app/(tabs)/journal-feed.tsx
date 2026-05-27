import React, { useCallback, useState } from 'react';
import { View, Pressable, StyleSheet, Image, FlatList } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Sparkles, Pencil, Mic, Video as VideoIcon, Flame, X as CloseIcon, Play } from 'lucide-react-native';
import * as Haptics from '@/lib/haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { SelectionDeleteBtn } from '@/components/SelectionDeleteBtn';
import { spacing, radii, useColors, shadows } from '@/theme';
import { confirm } from '@/lib/confirm';
import { useJournalStore } from '@/features/journal/store';
import { htmlToPlainText } from '@/features/realizations/types';
import type { JournalEntry } from '@/features/journal/types';

export default function JournalFeedTab() {
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

  const openEditor = () => router.push('/journal');

  const ListHeader = (
    <View style={styles.header}>
      <Text variant="display">Journal</Text>

      {/* Streak + today count */}
      {streak > 0 || todayCount > 0 ? (
        <View style={styles.statsRow}>
          {streak > 0 ? (
            <View style={[styles.statPill, { backgroundColor: colors.butterSoft }]}>
              <Flame size={13} color={colors.textSoft} strokeWidth={2} />
              <Text variant="caption" color={colors.textSoft}>
                {streak} day{streak === 1 ? '' : 's'} in a row
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
            <Text variant="h2" align="center">Your private space</Text>
            <Text variant="body" color={colors.textMuted} align="center" style={{ maxWidth: 260, lineHeight: 24 }}>
              Thoughts, feelings, moments. Everything you capture here is yours alone.
            </Text>
            <Pressable
              onPress={openEditor}
              style={({ pressed }) => [
                styles.emptyBtn,
                { backgroundColor: colors.text },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Pencil size={16} color={colors.bg} strokeWidth={2} />
              <Text variant="bodyMedium" color={colors.bg}>Begin</Text>
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

      {/* Write FAB */}
      {!selectionMode ? (
        <Pressable
          onPress={openEditor}
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

      {/* Selection controls */}
      {selectionMode ? (
        <>
          <Pressable
            onPress={exitSelection}
            hitSlop={10}
            style={[styles.selCancel, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
          >
            <CloseIcon size={18} color={colors.text} strokeWidth={2} />
          </Pressable>
          <SelectionDeleteBtn onPress={bulkDelete} />
        </>
      ) : null}
    </Screen>
  );
}

// Text-first card: content at top, compact media thumbnails pinned at bottom
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
  const images = entry.attachments.filter((a) => a.kind === 'image');
  const videos = entry.attachments.filter((a) => a.kind === 'video');
  const audios = entry.attachments.filter((a) => a.kind === 'audio');
  const hasMedia = images.length > 0 || videos.length > 0 || audios.length > 0;

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
      <View style={styles.cardBody}>
        {/* Timestamp + selection circle */}
        <View style={styles.cardHead}>
          <Text variant="caption" color={colors.textMuted} style={{ flex: 1 }}>
            {format(entry.createdAt, 'EEE, MMM d · h:mm a').toUpperCase()}
          </Text>
          {selectionMode ? (
            <View
              style={{
                width: 20, height: 20, borderRadius: 10,
                borderWidth: 1.5,
                borderColor: selected ? colors.text : colors.hairline,
                backgroundColor: selected ? colors.text : 'transparent',
              }}
            />
          ) : null}
        </View>

        {/* Title */}
        {entry.title ? (
          <Text variant="h3" numberOfLines={2} style={{ marginTop: 2, marginBottom: previewText ? 4 : 0 }}>
            {entry.title}
          </Text>
        ) : null}

        {/* Body preview — text is the star */}
        {previewText ? (
          <Text
            variant="body"
            numberOfLines={entry.title ? 4 : 7}
            color={entry.title ? colors.textSoft : colors.text}
            style={{ lineHeight: 22 }}
          >
            {previewText}
          </Text>
        ) : null}

        {/* Compact media strip — always below text, small thumbnails */}
        {hasMedia ? (
          <View style={[styles.mediaStrip, { borderTopColor: colors.hairline }]}>
            {/* Image thumbnails (max 3, then +N badge) */}
            {images.slice(0, 3).map((img, i) => (
              <View key={i} style={[styles.mediaThumbnail, { borderColor: colors.hairline }]}>
                <Image source={{ uri: img.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              </View>
            ))}
            {images.length > 3 ? (
              <View style={[styles.mediaThumbnail, styles.mediaMore, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
                <Text variant="caption" color={colors.textSoft}>+{images.length - 3}</Text>
              </View>
            ) : null}

            {/* Video thumbnails */}
            {videos.slice(0, 2).map((vid, i) => (
              <View key={i} style={[styles.mediaThumbnail, { backgroundColor: '#111', borderColor: colors.hairline }]}>
                <View style={styles.videoIcon}>
                  <Play size={12} color="#fff" fill="#fff" />
                </View>
              </View>
            ))}

            {/* Audio pills */}
            {audios.map((aud, i) => (
              <View key={i} style={[styles.audioPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
                <Mic size={11} color={colors.textMuted} strokeWidth={2} />
                {aud.duration ? (
                  <Text variant="caption" color={colors.textMuted}>{fmtSecs(Math.round(aud.duration))}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function fmtSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  list: { paddingBottom: 200 },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
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
  cardBody: { padding: spacing.lg, gap: spacing.xs },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Compact media strip at bottom of card
  mediaStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  mediaThumbnail: {
    width: 48, height: 48,
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  mediaMore: {
    alignItems: 'center', justifyContent: 'center',
  },
  videoIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  audioPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radii.pill, borderWidth: 1,
  },

  empty: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingTop: 60,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: radii.xxl,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyBtn: {
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
