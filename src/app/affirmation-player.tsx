/**
 * Affirmation player — full-screen immersive reader.
 *
 * Layout:
 *   • Top: progress dots + close
 *   • Center: large italic affirmation text (fades in)
 *   • Bottom: prev / index / next  ·  heart save
 *
 * Navigation: tap right-half → next, tap left-half → prev.
 * Background: collection cover color at low opacity over app bg.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Pressable, StyleSheet, Animated, Share, StatusBar,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart, ChevronLeft, ChevronRight, Share2 } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { radii, spacing, fonts, useColors } from '@/theme';
import * as repo from '@/features/affirmations/repo';
import type { AffirmationCollection, Affirmation } from '@/features/affirmations/types';

export default function AffirmationPlayerScreen() {
  const router  = useRouter();
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams<{ collectionId?: string; shuffle?: string }>();

  const [collection,    setCollection]    = useState<AffirmationCollection | null>(null);
  const [affirmations,  setAffirmations]  = useState<Affirmation[]>([]);
  const [index,         setIndex]         = useState(0);
  const [savedIds,      setSavedIds]      = useState<Set<string>>(new Set());
  const [done,          setDone]          = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(() => {
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [opacity]);

  useEffect(() => {
    (async () => {
      if (!params.collectionId) return;
      const [col, affs, saved] = await Promise.all([
        repo.getCollection(params.collectionId),
        repo.listAffirmations(params.collectionId),
        repo.listSavedIds(),
      ]);
      setCollection(col);
      setSavedIds(saved);

      let ordered = affs;
      if (params.shuffle === '1') {
        ordered = [...affs].sort(() => Math.random() - 0.5);
      }
      setAffirmations(ordered);
      fadeIn();
    })();
  }, [params.collectionId, params.shuffle]);

  // Log the session once when the screen mounts
  useEffect(() => {
    if (!params.collectionId) return;
    repo.recordSession(params.collectionId).catch(() => {});
  }, [params.collectionId]);

  const current = affirmations[index];
  const total   = affirmations.length;
  const isSaved = current ? savedIds.has(current.id) : false;

  const goTo = (newIdx: number) => {
    if (newIdx < 0) return;
    if (newIdx >= total) { setDone(true); return; }
    setIndex(newIdx);
    fadeIn();
  };

  const handleToggleSave = async () => {
    if (!current) return;
    const nowSaved = await repo.toggleSave(current.id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (nowSaved) next.add(current.id);
      else next.delete(current.id);
      return next;
    });
  };

  const handleShare = async () => {
    if (!current) return;
    await Share.share({ message: `"${current.body}"` });
  };

  const bgColor = collection?.coverColor ?? '#9880B8';

  // ── Done screen ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={[styles.root, { backgroundColor: colors.bg }]}>
          <View style={[styles.doneBg, { backgroundColor: bgColor + '28' }]} />
          <SafeAreaView style={styles.doneInner} edges={['top', 'bottom']}>
            <Text style={[styles.doneEmoji]}>{collection?.emoji ?? '✨'}</Text>
            <Text variant="h1" align="center" style={{ marginTop: spacing.lg }}>
              {total} affirmation{total === 1 ? '' : 's'}
            </Text>
            <Text
              variant="body"
              color={colors.textSoft}
              align="center"
              style={{ marginTop: spacing.sm, maxWidth: 280 }}
            >
              You showed up for yourself today. That matters.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={[styles.doneBtn, { backgroundColor: bgColor }]}
            >
              <Text variant="bodyMedium" style={{ color: '#fff' }}>Done</Text>
            </Pressable>
            <Pressable
              onPress={() => { setIndex(0); setDone(false); fadeIn(); }}
              style={{ marginTop: spacing.lg, paddingVertical: spacing.md }}
            >
              <Text variant="body" color={colors.textMuted}>Play again</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {/* Soft colour wash from collection */}
        <View style={[styles.bgWash, { backgroundColor: bgColor + '1E' }]} />

        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* ── Top bar ─────────────────────────────────────────────── */}
          <View style={styles.topBar}>
            {/* Progress dots */}
            <View style={styles.dots}>
              {affirmations.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === index ? colors.text : colors.hairline,
                      width: i === index ? 16 : 6,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Actions */}
            <View style={styles.topActions}>
              <Pressable onPress={handleShare} hitSlop={10} style={styles.topBtn}>
                <Share2 size={18} color={colors.textSoft} strokeWidth={1.75} />
              </Pressable>
              <Pressable onPress={() => router.back()} hitSlop={10} style={styles.topBtn}>
                <X size={20} color={colors.textSoft} strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          {/* ── Tap zones ───────────────────────────────────────────── */}
          <View style={styles.tapZones}>
            <Pressable style={styles.tapZone} onPress={() => goTo(index - 1)} />
            <Pressable style={styles.tapZone} onPress={() => goTo(index + 1)} />
          </View>

          {/* ── Affirmation text ────────────────────────────────────── */}
          <View style={styles.textArea} pointerEvents="none">
            {current ? (
              <Animated.View style={{ opacity }}>
                {/* Collection name */}
                <Text
                  variant="caption"
                  color={colors.textMuted}
                  style={{ textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xl, textAlign: 'center' }}
                >
                  {collection?.title}
                </Text>
                {/* The affirmation */}
                <Text style={[styles.affText, { color: colors.text }]}>
                  {current.body}
                </Text>
                {/* Index */}
                <Text
                  variant="caption"
                  color={colors.textFaint}
                  style={{ textAlign: 'center', marginTop: spacing.xl }}
                >
                  {index + 1} of {total}
                </Text>
              </Animated.View>
            ) : null}
          </View>

          {/* ── Bottom controls ─────────────────────────────────────── */}
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Pressable
              onPress={() => goTo(index - 1)}
              hitSlop={10}
              style={[styles.navBtn, { borderColor: colors.hairline, opacity: index === 0 ? 0.3 : 1 }]}
            >
              <ChevronLeft size={22} color={colors.text} strokeWidth={1.75} />
            </Pressable>

            <Pressable onPress={handleToggleSave} hitSlop={10} style={styles.heartBtn}>
              <Heart
                size={26}
                color={isSaved ? '#C07880' : colors.textMuted}
                fill={isSaved ? '#C07880' : 'transparent'}
                strokeWidth={1.75}
              />
            </Pressable>

            <Pressable
              onPress={() => goTo(index + 1)}
              hitSlop={10}
              style={[styles.navBtn, { backgroundColor: bgColor, borderColor: bgColor }]}
            >
              <ChevronRight size={22} color="#fff" strokeWidth={1.75} />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgWash: {
    ...StyleSheet.absoluteFillObject,
  },
  doneBg: {
    ...StyleSheet.absoluteFillObject,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  topBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },

  // Tap zones (invisible, left/right halves)
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    top: 80,
    bottom: 100,
  },
  tapZone: { flex: 1 },

  // Text
  textArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl + spacing.md,
  },
  affText: {
    fontSize: 26,
    lineHeight: 40,
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: fonts.serif,
  },

  // Bottom
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl + spacing.md,
    paddingTop: spacing.lg,
  },
  navBtn: {
    width: 52, height: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  heartBtn: {
    width: 52, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },

  // Done screen
  doneInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  doneEmoji: { fontSize: 64 },
  doneBtn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.pill,
  },
});
