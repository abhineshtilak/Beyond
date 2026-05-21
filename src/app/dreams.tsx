import React, { useState, useCallback } from 'react';
import { View, FlatList, Pressable, Image, StyleSheet } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Sparkle, X as CloseIcon, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { radii, spacing, palette, shadows, useColors } from '@/theme';
import { confirm } from '@/lib/confirm';
import { useDreamsStore } from '@/features/dreams/store';
import * as repo from '@/features/dreams/repo';
import type { Dream } from '@/features/dreams/types';

const CARD_TINTS = [palette.sageSoft, palette.lavenderSoft, palette.skySoft, palette.peachSoft, palette.butterSoft, palette.roseSoft];

export default function DreamsScreen() {
  const router = useRouter();
  const colors = useColors();
  const items = useDreamsStore((s) => s.items);
  const refresh = useDreamsStore((s) => s.refresh);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionMode = selected.size > 0;

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

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
      title: `Let go of ${selected.size} dream${selected.size === 1 ? '' : 's'}?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    for (const id of selected) await repo.remove(id);
    await refresh();
    exitSelection();
  };

  const openDream = (id?: string) =>
    router.push(id ? { pathname: '/dream', params: { id } } : '/dream');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll={false} padded={false}>
        <FlatList
          data={items}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
              {selectionMode ? (
                <View style={styles.header}>
                  <IconButton icon={CloseIcon} onPress={exitSelection} bg={colors.surface} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                      Selection
                    </Text>
                    <Text variant="h2" style={{ marginTop: 2 }}>{selected.size} selected</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.header}>
                  <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                      The larger picture
                    </Text>
                    <Text variant="h1" style={{ marginTop: 2 }}>Dreams</Text>
                  </View>
                </View>
              )}
              <Text variant="body" color={colors.textSoft}>
                {selectionMode
                  ? 'Tap to add or remove from selection.'
                  : 'What kind of life are you working toward? Save the vision somewhere quiet.'}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <DreamRow
              dream={item}
              tint={CARD_TINTS[index % CARD_TINTS.length]}
              selectionMode={selectionMode}
              selected={selected.has(item.id)}
              onPress={() => (selectionMode ? toggleSel(item.id) : openDream(item.id))}
              onLongPress={() => enterSelection(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <EmptyState
              icon={Sparkle}
              title="Picture the life"
              message="Add one dream. Add a photo if you have one. Look at it often."
            />
          }
        />

        {selectionMode ? (
          <View style={[styles.selBar, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <Pressable
              onPress={bulkDelete}
              style={({ pressed }) => [
                styles.barBtn,
                { backgroundColor: '#C97B6E' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Trash2 size={18} color={colors.bg} strokeWidth={1.8} />
              <Text variant="smallMedium" color={colors.bg}>Delete</Text>
            </Pressable>
          </View>
        ) : (
          <Fab onPress={() => openDream()} />
        )}
      </Screen>
    </>
  );
}

function DreamRow({
  dream,
  tint,
  selectionMode,
  selected,
  onPress,
  onLongPress,
}: {
  dream: Dream;
  tint: string;
  selectionMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tint, borderColor: selected ? colors.text : colors.hairline },
        pressed && { opacity: 0.92 },
      ]}
    >
      {dream.imageUri ? (
        <Image source={{ uri: dream.imageUri }} style={styles.image} />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: tint }]}>
          <Sparkle size={36} color={colors.textMuted} strokeWidth={1.4} />
        </View>
      )}
      <View style={[styles.body, { backgroundColor: colors.surface }]}>
        <Text variant="h2" numberOfLines={2}>{dream.title}</Text>
        {dream.description ? (
          <Text variant="body" color={colors.textSoft} numberOfLines={2} style={{ marginTop: 4 }}>
            {dream.description}
          </Text>
        ) : null}
        {dream.why ? (
          <View style={[styles.whyBox, { borderTopColor: colors.hairline }]}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>Why</Text>
            <Text variant="small" color={colors.textSoft} numberOfLines={3} style={{ marginTop: 2 }}>
              {dream.why}
            </Text>
          </View>
        ) : null}
      </View>
      {selected ? (
        <View style={[styles.selDot, { backgroundColor: colors.text }]}>
          <Text variant="caption" color={colors.bg}>✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: 180 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.card,
    position: 'relative',
  },
  image: { width: '100%', height: 180 },
  imagePlaceholder: { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg },
  whyBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  selDot: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  selBar: {
    position: 'absolute',
    left: spacing.lg, right: spacing.lg, bottom: 110,
    padding: spacing.md,
    borderRadius: radii.xxl,
    borderWidth: 1,
  },
  barBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: radii.pill,
  },
});
