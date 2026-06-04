import React, { useCallback, useState } from 'react';
import {
  View, FlatList, Pressable, StyleSheet, TextInput, Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ChevronLeft, Play, Shuffle, Heart, Plus, Trash2, X } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { radii, spacing, shadows, fonts, useColors } from '@/theme';
import * as repo from '@/features/affirmations/repo';
import type { AffirmationCollection, Affirmation } from '@/features/affirmations/types';

export default function AffirmationCollectionScreen() {
  const router  = useRouter();
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams<{ id?: string }>();

  const [collection, setCollection]     = useState<AffirmationCollection | null>(null);
  const [affirmations, setAffirmations] = useState<Affirmation[]>([]);
  const [addingText, setAddingText]     = useState('');
  const [showAdd, setShowAdd]           = useState(false);
  const [saving, setSaving]             = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    const [col, affs] = await Promise.all([
      repo.getCollection(params.id),
      repo.listAffirmations(params.id),
    ]);
    setCollection(col);
    setAffirmations(affs);
  }, [params.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleToggleSave = async (aff: Affirmation) => {
    await repo.toggleSave(aff.id);
    await load();
  };

  const handleDelete = (aff: Affirmation) => {
    if (!collection?.isCustom) return;
    Alert.alert('Remove affirmation', `Remove this from "${collection.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => { await repo.deleteAffirmation(aff.id); await load(); },
      },
    ]);
  };

  const handleAdd = async () => {
    if (!addingText.trim() || !params.id) return;
    setSaving(true);
    await repo.addAffirmation(params.id, addingText);
    setAddingText('');
    setShowAdd(false);
    setSaving(false);
    await load();
  };

  const startPlayer = (shuffle = false) => {
    if (!params.id || affirmations.length === 0) return;
    router.push({
      pathname: '/affirmation-player',
      params: { collectionId: params.id, shuffle: shuffle ? '1' : '0' },
    } as any);
  };

  if (!collection) return null;

  const isCustom = collection.isCustom;
  const swatchColor = collection.coverColor;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
        <FlatList
          data={affirmations}
          keyExtractor={(a) => a.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
          ListHeaderComponent={
            <View>
              {/* Back */}
              <View style={styles.headerRow}>
                <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
              </View>

              {/* Collection hero */}
              <View style={[styles.hero, { backgroundColor: swatchColor + 'AA' }]}>
                <Text style={styles.heroEmoji}>{collection.emoji}</Text>
              </View>

              {/* Meta */}
              <View style={styles.meta}>
                <Text variant="h1">{collection.title}</Text>
                <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
                  {collection.count ?? affirmations.length} affirmations
                  {(collection.sessionCount ?? 0) > 0
                    ? ` · played ${collection.sessionCount} time${collection.sessionCount === 1 ? '' : 's'}`
                    : ''}
                </Text>
              </View>

              {/* Play / Shuffle */}
              {affirmations.length > 0 ? (
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => startPlayer(false)}
                    style={[styles.actionBtn, { backgroundColor: swatchColor }]}
                  >
                    <Play size={16} color="#fff" fill="#fff" strokeWidth={2} />
                    <Text variant="bodyMedium" style={{ color: '#fff' }}>Play</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => startPlayer(true)}
                    style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.hairline, backgroundColor: colors.surface }]}
                  >
                    <Shuffle size={16} color={colors.text} strokeWidth={1.75} />
                    <Text variant="bodyMedium" color={colors.text}>Shuffle</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.affirmationRow, { borderBottomColor: colors.hairline }]}>
              <Text
                style={[styles.affirmationText, { color: colors.text }]}
                numberOfLines={0}
              >
                "{item.body}"
              </Text>
              <View style={styles.rowActions}>
                {/* Save / unsave */}
                <Pressable
                  onPress={() => handleToggleSave(item)}
                  hitSlop={10}
                  style={({ pressed }) => [styles.rowBtn, pressed && { opacity: 0.5 }]}
                >
                  <Heart
                    size={18}
                    color={item.saved ? '#C07880' : colors.textFaint}
                    fill={item.saved ? '#C07880' : 'transparent'}
                    strokeWidth={1.75}
                  />
                </Pressable>
                {/* Delete (custom only) */}
                {isCustom ? (
                  <Pressable
                    onPress={() => handleDelete(item)}
                    hitSlop={10}
                    style={({ pressed }) => [styles.rowBtn, pressed && { opacity: 0.5 }]}
                  >
                    <Trash2 size={16} color={colors.textFaint} strokeWidth={1.75} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          )}
          ListFooterComponent={
            isCustom ? (
              <View style={{ marginTop: spacing.lg }}>
                {showAdd ? (
                  <View style={[styles.addBox, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                    <TextInput
                      value={addingText}
                      onChangeText={setAddingText}
                      placeholder="Write your affirmation…"
                      placeholderTextColor={colors.textFaint}
                      multiline
                      autoFocus
                      style={[styles.addInput, { color: colors.text, fontFamily: fonts.sans }]}
                    />
                    <View style={styles.addActions}>
                      <Pressable
                        onPress={() => { setShowAdd(false); setAddingText(''); }}
                        style={[styles.addBtn, { backgroundColor: colors.surfaceAlt }]}
                      >
                        <X size={15} color={colors.textSoft} strokeWidth={2} />
                      </Pressable>
                      <Pressable
                        onPress={handleAdd}
                        disabled={!addingText.trim() || saving}
                        style={[
                          styles.addBtn,
                          { backgroundColor: addingText.trim() ? colors.text : colors.surfaceAlt, flex: 1 },
                        ]}
                      >
                        <Text
                          variant="smallMedium"
                          color={addingText.trim() ? colors.bg : colors.textMuted}
                        >
                          {saving ? 'Adding…' : 'Add'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setShowAdd(true)}
                    style={({ pressed }) => [
                      styles.addTrigger,
                      { borderColor: colors.hairline },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Plus size={16} color={colors.textMuted} strokeWidth={2} />
                    <Text variant="body" color={colors.textMuted}>Add an affirmation</Text>
                  </Pressable>
                )}
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: spacing.xxl },
  headerRow: { paddingTop: spacing.md, marginBottom: spacing.md },

  hero: {
    height: 180,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  heroEmoji: { fontSize: 64 },

  meta: { gap: 4, marginBottom: spacing.lg },

  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  actionBtnOutline: {
    borderWidth: 1,
  },

  divider: { height: StyleSheet.hairlineWidth, marginBottom: spacing.md },

  affirmationRow: {
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  affirmationText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 26,
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: 4,
  },
  rowBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },

  // Add affirmation form
  addBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  addInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 80,
  },
  addActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addBtn: {
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  addTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
