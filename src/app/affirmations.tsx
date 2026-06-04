import React, { useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet, FlatList } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Plus, Heart } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { radii, spacing, shadows, useColors } from '@/theme';
import { useAffirmationsStore } from '@/features/affirmations/store';
import { getDailyAffirmation, FEATURED_IDS } from '@/features/affirmations/seeds';
import type { AffirmationCollection } from '@/features/affirmations/types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function minuteLabel(count: number) {
  const mins = Math.max(1, Math.round(count * 0.5)); // ~30s per affirmation
  return `${mins} min`;
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function AffirmationsScreen() {
  const router   = useRouter();
  const colors   = useColors();
  const refresh  = useAffirmationsStore((s) => s.refresh);
  const collections = useAffirmationsStore((s) => s.collections);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const daily = useMemo(() => getDailyAffirmation(), []);

  const curated  = collections.filter((c) => !c.isCustom);
  const custom   = collections.filter((c) => c.isCustom);
  const featured = curated.filter((c) => FEATURED_IDS.includes(c.id));
  const rest     = curated.filter((c) => !FEATURED_IDS.includes(c.id));

  const openCollection = (id: string) =>
    router.push({ pathname: '/affirmation-collection', params: { id } } as any);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Beyond
            </Text>
            <Text variant="h1" style={{ marginTop: 2 }}>Affirmations</Text>
          </View>
        </View>

        <Text variant="body" color={colors.textSoft} style={{ marginBottom: spacing.xl }}>
          Words you repeat until you believe them — because they're true.
        </Text>

        {/* ── Today's affirmation ─────────────────────────────────────── */}
        <Pressable
          onPress={() => router.push({ pathname: '/affirmation-player', params: { collectionId: 'morning-power' } } as any)}
          style={({ pressed }) => [
            styles.dailyCard,
            { backgroundColor: colors.surface, borderColor: colors.hairline },
            pressed && { opacity: 0.93 },
          ]}
        >
          <View style={[styles.dailyBadge, { backgroundColor: colors.accentSoft }]}>
            <Text variant="caption" color={colors.textSoft} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Today
            </Text>
          </View>
          <Text
            style={[styles.dailyText, { color: colors.text }]}
            numberOfLines={4}
          >
            "{daily.body}"
          </Text>
          <Text variant="small" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
            — {daily.collection}
          </Text>
        </Pressable>

        {/* ── My Affirmations (custom/saved) ──────────────────────────── */}
        {custom.length > 0 ? (
          <View style={{ marginBottom: spacing.lg }}>
            <SectionLabel title="Yours" />
            <View style={styles.grid}>
              {custom.map((c) => (
                <CollectionCard
                  key={c.id}
                  collection={c}
                  onPress={() => openCollection(c.id)}
                />
              ))}
              <NewFolderCard onPress={() => router.push('/affirmation-collection-new' as any)} />
            </View>
          </View>
        ) : null}

        {/* ── Featured collections ────────────────────────────────────── */}
        {featured.length > 0 ? (
          <View style={{ marginBottom: spacing.lg }}>
            <SectionLabel title="A good place to start" />
            <View style={styles.grid}>
              {featured.map((c) => (
                <CollectionCard key={c.id} collection={c} onPress={() => openCollection(c.id)} />
              ))}
            </View>
          </View>
        ) : null}

        {/* ── All other collections ────────────────────────────────────── */}
        {rest.length > 0 ? (
          <View style={{ marginBottom: spacing.lg }}>
            <SectionLabel title="Explore" />
            <View style={styles.grid}>
              {rest.map((c) => (
                <CollectionCard key={c.id} collection={c} onPress={() => openCollection(c.id)} />
              ))}
            </View>
          </View>
        ) : null}
      </Screen>
    </>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text
      variant="caption"
      color={colors.textMuted}
      style={{ textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.md }}
    >
      {title}
    </Text>
  );
}

// ─── Collection card ──────────────────────────────────────────────────────────

function CollectionCard({
  collection, onPress,
}: {
  collection: AffirmationCollection; onPress: () => void;
}) {
  const colors = useColors();
  const count  = collection.count ?? 0;
  const mins   = minuteLabel(count);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.hairline },
        pressed && { opacity: 0.9 },
      ]}
    >
      {/* Colour swatch top area */}
      <View style={[styles.cardSwatch, { backgroundColor: collection.coverColor + 'CC' }]}>
        <Text style={styles.cardEmoji}>{collection.emoji}</Text>
      </View>
      {/* Info */}
      <View style={styles.cardInfo}>
        <Text variant="smallMedium" numberOfLines={1}>{collection.title}</Text>
        <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
          {count} · {mins}
        </Text>
        {(collection.sessionCount ?? 0) > 0 ? (
          <Text variant="caption" color={colors.textFaint} style={{ marginTop: 1 }}>
            {collection.sessionCount} session{collection.sessionCount === 1 ? '' : 's'}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── New folder card ──────────────────────────────────────────────────────────

function NewFolderCard({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.hairline, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.cardSwatch, { backgroundColor: colors.surfaceAlt }]}>
        <Plus size={26} color={colors.textMuted} strokeWidth={1.75} />
      </View>
      <View style={styles.cardInfo}>
        <Text variant="smallMedium" color={colors.textSoft}>New collection</Text>
        <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>Create your own</Text>
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
    marginBottom: spacing.md,
  },

  // Daily pick
  dailyCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.sm,
    ...shadows.soft,
  },
  dailyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
  },
  dailyText: {
    fontSize: 20,
    lineHeight: 30,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: '47%',
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.soft,
  },
  cardSwatch: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 40,
  },
  cardInfo: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
});
