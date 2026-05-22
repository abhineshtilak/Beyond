import React, { useCallback, useState } from 'react';
import { View, FlatList, Pressable, StyleSheet, TextInput, Image } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  BookOpen,
  Search,
  Quote,
  X as CloseIcon,
  Image as ImageIcon,
  Mic,
  Video as VideoIcon,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { SelectionDeleteBtn } from '@/components/SelectionDeleteBtn';
import { colors, fonts, radii, spacing } from '@/theme';
import { confirm } from '@/lib/confirm';
import { useRealizationsStore } from '@/features/realizations/store';
import {
  REALIZATION_META,
  REALIZATION_KINDS,
  htmlToPlainText,
  type Realization,
  type RealizationKind,
} from '@/features/realizations/types';

export default function RealizationsScreen() {
  const router = useRouter();
  const items = useRealizationsStore((s) => s.items);
  const query = useRealizationsStore((s) => s.query);
  const kind = useRealizationsStore((s) => s.kind);
  const setQuery = useRealizationsStore((s) => s.setQuery);
  const setKind = useRealizationsStore((s) => s.setKind);
  const refresh = useRealizationsStore((s) => s.refresh);
  const removeMany = useRealizationsStore((s) => s.removeMany);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionMode = selected.size > 0;

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

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
    setSelected(new Set(items.map((i) => i.id)));
  };

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

  const openEntry = (id: string) => router.push({ pathname: '/realization', params: { id } });
  const openNew = () => router.push('/realization');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll={false} padded={false}>
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
              {selectionMode ? (
                <View style={styles.selHeader}>
                  <IconButton icon={CloseIcon} onPress={exitSelection} bg={colors.surface} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                      Selection
                    </Text>
                    <Text variant="h2" style={{ marginTop: 2 }}>
                      {selected.size} entr{selected.size === 1 ? 'y' : 'ies'}
                    </Text>
                  </View>
                  <Pressable onPress={selectAll} hitSlop={10} style={styles.selPill}>
                    <Text variant="smallMedium" color={colors.textSoft}>
                      {selected.size === items.length && items.length > 0 ? 'NONE' : 'ALL'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.header}>
                    <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
                    <View style={{ flex: 1 }}>
                      <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                        Second brain
                      </Text>
                      <Text variant="h1" style={{ marginTop: 2 }}>Realizations</Text>
                    </View>
                  </View>

                  <View style={styles.searchBox}>
                    <Search size={16} color={colors.textMuted} strokeWidth={1.75} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Search your thoughts..."
                      placeholderTextColor={colors.textFaint}
                      style={[{ fontFamily: fonts.sans, fontSize: 15, flex: 1, color: colors.text, paddingVertical: 0 }]}
                    />
                  </View>

                  <View style={styles.filters}>
                    <Chip label="All" selected={kind === null} size="sm" onPress={() => setKind(null)} />
                    {REALIZATION_KINDS.map((k) => (
                      <Chip
                        key={k}
                        label={REALIZATION_META[k].label}
                        selected={kind === k}
                        tint={REALIZATION_META[k].tint}
                        size="sm"
                        onPress={() => setKind(kind === k ? null : k)}
                      />
                    ))}
                  </View>

                  <Text variant="small" color={colors.textMuted}>
                    Press and hold an entry to select.
                  </Text>
                </>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <EntryCard
              item={item}
              selectionMode={selectionMode}
              selected={selected.has(item.id)}
              onPress={() => (selectionMode ? toggleSel(item.id) : openEntry(item.id))}
              onLongPress={() => enterSelection(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <EmptyState
              icon={BookOpen}
              title={query || kind ? 'Nothing found' : 'Your second brain'}
              message={
                query || kind
                  ? 'Try a different word or kind.'
                  : 'Capture realizations, lessons, mistakes, quotes, and observations as they arrive. Your future self will thank you.'
              }
            />
          }
        />

        {selectionMode ? (
          <SelectionDeleteBtn onPress={bulkDelete} />
        ) : (
          <Fab onPress={openNew} />
        )}
      </Screen>
    </>
  );
}

function EntryCard({
  item,
  selectionMode,
  selected,
  onPress,
  onLongPress,
}: {
  item: Realization;
  selectionMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const meta = REALIZATION_META[item.kind];
  const previewText = htmlToPlainText(item.bodyHtml) || item.content || '';
  const firstImage = item.attachments.find((a) => a.kind === 'image');
  const counts = item.attachments.reduce(
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
        selected && styles.entrySelected,
        pressed && { opacity: 0.92 },
      ]}
    >
      {firstImage ? (
        <Image source={{ uri: firstImage.uri }} style={styles.entryImage} />
      ) : null}
      <View style={styles.entryBody}>
        <View style={styles.entryHead}>
          <View style={[styles.kindDot, { backgroundColor: meta.tint }]} />
          <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
            {meta.label}
          </Text>
          <Text variant="caption" color={colors.textFaint}>·</Text>
          <Text variant="caption" color={colors.textMuted}>
            {format(item.createdAt, 'MMM d, yyyy').toUpperCase()}
          </Text>
          {selectionMode ? (
            <View style={{ marginLeft: 'auto' }}>
              <View style={[styles.selDot, selected && styles.selDotOn]} />
            </View>
          ) : null}
        </View>

        {item.title ? (
          <Text variant="h3" numberOfLines={2} style={{ marginTop: 6 }}>{item.title}</Text>
        ) : null}

        {item.kind === 'quote' && previewText ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 }}>
            <Quote size={14} color={colors.textMuted} strokeWidth={1.75} />
            <Text variant="body" style={{ flex: 1, fontStyle: 'italic', lineHeight: 24 }} numberOfLines={5}>
              {previewText}
            </Text>
          </View>
        ) : previewText ? (
          <Text variant="body" numberOfLines={5} style={{ lineHeight: 23, marginTop: 6 }}>
            {previewText}
          </Text>
        ) : null}

        {item.attachments.length > 0 ? (
          <View style={styles.attRow}>
            {counts.image ? <Badge icon={ImageIcon} count={counts.image} /> : null}
            {counts.audio ? <Badge icon={Mic} count={counts.audio} /> : null}
            {counts.video ? <Badge icon={VideoIcon} count={counts.video} /> : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function Badge({ icon: Icon, count }: { icon: any; count: number }) {
  return (
    <View style={styles.badge}>
      <Icon size={11} color={colors.textMuted} strokeWidth={2} />
      <Text variant="caption" color={colors.textMuted}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: 180,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  selHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  selPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  entry: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  entrySelected: {
    borderColor: colors.text,
    backgroundColor: colors.accentSoft,
  },
  entryImage: { width: '100%', height: 180 },
  entryBody: { padding: spacing.lg },
  entryHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kindDot: { width: 8, height: 8, borderRadius: 4 },
  selDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  selDotOn: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  attRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  actionBar: {
    position: 'absolute',
    left: spacing.lg, right: spacing.lg, bottom: 110,
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
  barDanger: {
    backgroundColor: '#C97B6E',
  },
});
