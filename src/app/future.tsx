import React, { useMemo, useState, useCallback } from 'react';
import { View, FlatList, Pressable, Image, StyleSheet } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Compass, Calendar as CalIcon, X as CloseIcon } from 'lucide-react-native';
import { SelectionDeleteBtn } from '@/components/SelectionDeleteBtn';
import { format, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { colors as staticColors, radii, spacing, palette, shadows, useColors } from '@/theme';
import { confirm } from '@/lib/confirm';
import { useFutureStore } from '@/features/future/store';
import * as repo from '@/features/future/repo';
import type { FuturePlan } from '@/features/future/types';

const TINTS = [palette.skySoft, palette.peachSoft, palette.sageSoft, palette.lavenderSoft, palette.butterSoft, palette.roseSoft];

export default function FuturePlansScreen() {
  const router = useRouter();
  const colors = useColors();
  const items = useFutureStore((s) => s.items);
  const refresh = useFutureStore((s) => s.refresh);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionMode = selected.size > 0;

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const columns = useMemo(() => {
    const left: FuturePlan[] = [];
    const right: FuturePlan[] = [];
    items.forEach((it, i) => (i % 2 === 0 ? left : right).push(it));
    return { left, right };
  }, [items]);

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
      title: `Delete ${selected.size} plan${selected.size === 1 ? '' : 's'}?`,
      message: "This can't be undone.",
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    for (const id of selected) await repo.remove(id);
    await refresh();
    exitSelection();
  };

  const renderCard = (item: FuturePlan, idx: number) => {
    const tint = TINTS[(idx * 2) % TINTS.length];
    const isSel = selected.has(item.id);
    return (
      <Pressable
        key={item.id}
        onPress={() =>
          selectionMode
            ? toggleSel(item.id)
            : router.push({ pathname: '/future-plan', params: { id: item.id } })
        }
        onLongPress={() => enterSelection(item.id)}
        delayLongPress={300}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: isSel ? colors.text : colors.hairline },
          pressed && { opacity: 0.92 },
        ]}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: tint }]}>
            <Compass size={28} color={colors.textMuted} strokeWidth={1.5} />
          </View>
        )}
        <View style={styles.body}>
          <Text variant="bodyMedium" numberOfLines={2}>{item.title}</Text>
          {item.plannedDate ? (
            <View style={styles.dateRow}>
              <CalIcon size={11} color={colors.textMuted} strokeWidth={2} />
              <Text variant="caption" color={colors.textMuted}>
                {format(parseISO(item.plannedDate), 'MMM d, yyyy').toUpperCase()}
              </Text>
            </View>
          ) : null}
          {item.description ? (
            <Text variant="small" color={colors.textSoft} numberOfLines={2} style={{ marginTop: 4 }}>
              {item.description}
            </Text>
          ) : null}
        </View>
        {isSel ? (
          <View style={[styles.selDot, { backgroundColor: colors.text }]}>
            <Text variant="caption" color={colors.bg}>✓</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll padded={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            {selectionMode ? (
              <>
                <IconButton icon={CloseIcon} onPress={exitSelection} bg={colors.surface} />
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                    Selection
                  </Text>
                  <Text variant="h2" style={{ marginTop: 2 }}>{selected.size} selected</Text>
                </View>
              </>
            ) : (
              <>
                <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                    Someday
                  </Text>
                  <Text variant="h1" style={{ marginTop: 2 }}>Future plans</Text>
                </View>
              </>
            )}
          </View>
          {!selectionMode ? (
            <Text variant="body" color={colors.textSoft} style={{ marginBottom: spacing.lg }}>
              Trips, ideas, places — the soft kind of looking forward.
            </Text>
          ) : (
            <Text variant="body" color={colors.textSoft} style={{ marginBottom: spacing.lg }}>
              Tap to add or remove from selection.
            </Text>
          )}

          {items.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="Soft plans"
              message="Save a trip you'd love to take, or an idea you want to keep. Add a picture if you have one."
            />
          ) : (
            <View style={styles.columns}>
              <View style={styles.column}>{columns.left.map((it, i) => renderCard(it, i * 2))}</View>
              <View style={styles.column}>{columns.right.map((it, i) => renderCard(it, i * 2 + 1))}</View>
            </View>
          )}
        </View>

        {selectionMode ? (
          <SelectionDeleteBtn onPress={bulkDelete} />
        ) : (
          <Fab onPress={() => router.push('/future-plan')} />
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  columns: { flexDirection: 'row', gap: spacing.md },
  column: { flex: 1, gap: spacing.md },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.card,
    position: 'relative',
  },
  image: { width: '100%', height: 140 },
  imagePlaceholder: { width: '100%', height: 90, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.md, gap: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  selDot: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
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
