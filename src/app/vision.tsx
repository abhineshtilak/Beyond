/**
 * Vision & Plans — unified screen that merges "Ambitions & Dreams" and "Future Plans"
 * into one place, with a clear segmented control and distinct placeholders so the
 * user understands which bucket each thought belongs in.
 *
 *  Dreams tab  → identity/aspiration goals: who you want to become, what you want to
 *                build, experiences that define your vision of a good life.
 *  Plans tab   → concrete future experiences: trips, events, projects with a rough date.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, Pressable, Image, StyleSheet } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Sparkles, Compass, X as CloseIcon } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import * as Haptics from '@/lib/haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { Fab } from '@/components/Fab';
import { SelectionDeleteBtn } from '@/components/SelectionDeleteBtn';
import { radii, spacing, palette, shadows, useColors } from '@/theme';
import { confirm } from '@/lib/confirm';
import { useDreamsStore } from '@/features/dreams/store';
import { useFutureStore } from '@/features/future/store';
import * as dreamsRepo from '@/features/dreams/repo';
import * as futureRepo from '@/features/future/repo';
import type { Dream } from '@/features/dreams/types';
import type { FuturePlan } from '@/features/future/types';

type Tab = 'dreams' | 'plans';

const DREAM_TINTS  = [palette.lavenderSoft, palette.sageSoft, palette.skySoft, palette.peachSoft, palette.butterSoft, palette.roseSoft];
const PLAN_TINTS   = [palette.skySoft, palette.peachSoft, palette.sageSoft, palette.lavenderSoft, palette.butterSoft, palette.roseSoft];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function VisionScreen() {
  const router  = useRouter();
  const colors  = useColors();
  const [tab, setTab] = useState<Tab>('dreams');

  const dreams  = useDreamsStore((s) => s.items);
  const plans   = useFutureStore((s) => s.items);
  const refreshDreams = useDreamsStore((s) => s.refresh);
  const refreshPlans  = useFutureStore((s) => s.refresh);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionMode = selected.size > 0;

  useFocusEffect(
    useCallback(() => {
      refreshDreams();
      refreshPlans();
    }, [refreshDreams, refreshPlans]),
  );

  // Reset selection when switching tabs
  const switchTab = (t: Tab) => { setSelected(new Set()); setTab(t); };

  const enterSelection = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelected(new Set([id]));
  };
  const toggleSel = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const exitSelection = () => setSelected(new Set());

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    const noun = tab === 'dreams' ? 'dream' : 'plan';
    const ok = await confirm({
      title: `Delete ${selected.size} ${noun}${selected.size === 1 ? '' : 's'}?`,
      message: "This can't be undone.",
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    for (const id of selected) {
      if (tab === 'dreams') await dreamsRepo.remove(id);
      else await futureRepo.remove(id);
    }
    if (tab === 'dreams') await refreshDreams(); else await refreshPlans();
    exitSelection();
  };

  const openEditor = (id?: string) => {
    if (tab === 'dreams') {
      router.push(id ? { pathname: '/dream', params: { id } } : '/dream');
    } else {
      router.push(id ? { pathname: '/future-plan', params: { id } } : '/future-plan');
    }
  };

  // ── Header ──────────────────────────────────────────────────────────────────
  const ListHeader = (
    <View style={styles.pageHeader}>
      {selectionMode ? (
        <View style={styles.hRow}>
          <IconButton icon={CloseIcon} onPress={exitSelection} bg={colors.surface} />
          <Text variant="h2">{selected.size} selected</Text>
        </View>
      ) : (
        <View style={styles.hRow}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              The bigger picture
            </Text>
            <Text variant="h1" style={{ marginTop: 2 }}>Vision & Plans</Text>
          </View>
        </View>
      )}

      {/* Segmented control */}
      <View style={[styles.segControl, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
        {(['dreams', 'plans'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => switchTab(t)}
            style={[
              styles.segItem,
              tab === t && { backgroundColor: colors.surface, borderColor: colors.hairline },
            ]}
          >
            {t === 'dreams'
              ? <Sparkles size={14} color={tab === t ? colors.text : colors.textMuted} strokeWidth={1.75} />
              : <Compass  size={14} color={tab === t ? colors.text : colors.textMuted} strokeWidth={1.75} />}
            <Text
              variant="smallMedium"
              color={tab === t ? colors.text : colors.textMuted}
            >
              {t === 'dreams' ? 'Dreams' : 'Plans'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Contextual hint under segment */}
      {!selectionMode ? (
        <Text variant="small" color={colors.textMuted} style={styles.hint}>
          {tab === 'dreams'
            ? 'Who you want to become. What kind of life you\'re building. Save the vision somewhere quiet.'
            : 'Trips, events and concrete experiences you\'re looking forward to. Add a rough date if you have one.'}
        </Text>
      ) : null}
    </View>
  );

  // ── Dreams list ─────────────────────────────────────────────────────────────
  if (tab === 'dreams') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Screen scroll={false} padded={false}>
          <FlatList
            data={dreams}
            keyExtractor={(d) => d.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={ListHeader}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.lavenderSoft }]}>
                  <Sparkles size={28} color={colors.textSoft} strokeWidth={1.6} />
                </View>
                <Text variant="h3" align="center">Picture the life</Text>
                <Text variant="body" color={colors.textMuted} align="center" style={{ maxWidth: 260 }}>
                  Add a dream. Add a photo if you have one.{'\n'}Look at it often.
                </Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <DreamCard
                dream={item}
                tint={DREAM_TINTS[index % DREAM_TINTS.length]}
                selectionMode={selectionMode}
                selected={selected.has(item.id)}
                onPress={() => selectionMode ? toggleSel(item.id) : openEditor(item.id)}
                onLongPress={() => enterSelection(item.id)}
              />
            )}
          />
          {selectionMode
            ? <SelectionDeleteBtn onPress={bulkDelete} />
            : <Fab onPress={() => openEditor()} />}
        </Screen>
      </>
    );
  }

  // ── Plans list (two-column masonry) ─────────────────────────────────────────
  const { left, right } = useMemo(() => {
    const l: FuturePlan[] = [];
    const r: FuturePlan[] = [];
    plans.forEach((p, i) => (i % 2 === 0 ? l : r).push(p));
    return { left: l, right: r };
  }, [plans]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll padded={false}>
        <View style={styles.planContainer}>
          {ListHeader}

          {plans.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
                <Compass size={28} color={colors.textSoft} strokeWidth={1.6} />
              </View>
              <Text variant="h3" align="center">Soft plans</Text>
              <Text variant="body" color={colors.textMuted} align="center" style={{ maxWidth: 260 }}>
                Save a trip you'd love to take, an event you're excited for, or an experience on your list.
              </Text>
            </View>
          ) : (
            <View style={styles.columns}>
              <View style={styles.column}>
                {left.map((p, i) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    tint={PLAN_TINTS[(i * 2) % PLAN_TINTS.length]}
                    selectionMode={selectionMode}
                    selected={selected.has(p.id)}
                    onPress={() => selectionMode ? toggleSel(p.id) : openEditor(p.id)}
                    onLongPress={() => enterSelection(p.id)}
                  />
                ))}
              </View>
              <View style={styles.column}>
                {right.map((p, i) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    tint={PLAN_TINTS[(i * 2 + 1) % PLAN_TINTS.length]}
                    selectionMode={selectionMode}
                    selected={selected.has(p.id)}
                    onPress={() => selectionMode ? toggleSel(p.id) : openEditor(p.id)}
                    onLongPress={() => enterSelection(p.id)}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {selectionMode
          ? <SelectionDeleteBtn onPress={bulkDelete} />
          : <Fab onPress={() => openEditor()} />}
      </Screen>
    </>
  );
}

// ─── Dream card ───────────────────────────────────────────────────────────────

function DreamCard({
  dream, tint, selectionMode, selected, onPress, onLongPress,
}: {
  dream: Dream; tint: string; selectionMode: boolean; selected: boolean;
  onPress: () => void; onLongPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress} onLongPress={onLongPress} delayLongPress={300}
      style={({ pressed }) => [
        styles.dreamCard,
        { borderColor: selected ? colors.text : colors.hairline },
        pressed && { opacity: 0.92 },
      ]}
    >
      {dream.imageUri ? (
        <Image source={{ uri: dream.imageUri }} style={styles.dreamImage} />
      ) : (
        <View style={[styles.dreamImagePlaceholder, { backgroundColor: tint }]}>
          <Sparkles size={32} color={colors.textMuted} strokeWidth={1.4} />
        </View>
      )}
      <View style={[styles.dreamBody, { backgroundColor: colors.surface }]}>
        <Text variant="h3" numberOfLines={2}>{dream.title}</Text>
        {dream.description ? (
          <Text variant="body" color={colors.textSoft} numberOfLines={2} style={{ marginTop: 4 }}>
            {dream.description}
          </Text>
        ) : null}
        {dream.why ? (
          <View style={[styles.dreamWhy, { borderTopColor: colors.hairline }]}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>Why</Text>
            <Text variant="small" color={colors.textSoft} numberOfLines={2} style={{ marginTop: 2 }}>
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

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan, tint, selectionMode, selected, onPress, onLongPress,
}: {
  plan: FuturePlan; tint: string; selectionMode: boolean; selected: boolean;
  onPress: () => void; onLongPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress} onLongPress={onLongPress} delayLongPress={300}
      style={({ pressed }) => [
        styles.planCard,
        { backgroundColor: colors.surface, borderColor: selected ? colors.text : colors.hairline },
        pressed && { opacity: 0.92 },
      ]}
    >
      {plan.imageUri ? (
        <Image source={{ uri: plan.imageUri }} style={styles.planImage} resizeMode="cover" />
      ) : (
        <View style={[styles.planImagePlaceholder, { backgroundColor: tint }]}>
          <Compass size={22} color={colors.textMuted} strokeWidth={1.5} />
        </View>
      )}
      <View style={styles.planBody}>
        <Text variant="bodyMedium" numberOfLines={2}>{plan.title}</Text>
        {plan.plannedDate ? (
          <Text variant="caption" color={colors.textMuted} style={{ marginTop: 4 }}>
            {format(parseISO(plan.plannedDate), 'MMM yyyy').toUpperCase()}
          </Text>
        ) : null}
        {plan.description ? (
          <Text variant="small" color={colors.textSoft} numberOfLines={2} style={{ marginTop: 4 }}>
            {plan.description}
          </Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: 180 },
  planContainer: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },

  pageHeader: { marginBottom: spacing.lg, gap: spacing.md },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  // Segmented control
  segControl: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  segItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  hint: { lineHeight: 18 },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.huge,
    paddingBottom: spacing.huge,
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 60, height: 60, borderRadius: radii.xxl,
    alignItems: 'center', justifyContent: 'center',
  },

  // Selection dot
  selDot: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  // Dream card
  dreamCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.card,
    position: 'relative',
  },
  dreamImage: { width: '100%', height: 180 },
  dreamImagePlaceholder: { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center' },
  dreamBody: { padding: spacing.lg },
  dreamWhy: {
    marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1,
  },

  // Plan card (two-column masonry)
  columns: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  column:  { flex: 1, gap: spacing.md },
  planCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.card,
    position: 'relative',
  },
  planImage: { width: '100%', height: 120 },
  planImagePlaceholder: { width: '100%', height: 80, alignItems: 'center', justifyContent: 'center' },
  planBody: { padding: spacing.md, gap: 2 },
});
