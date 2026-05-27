import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, Alert, Keyboard,
} from 'react-native';
import { StableTextInput } from '@/components/StableTextInput';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Trash2, Check, Pencil } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { radii, spacing, fonts, useColors } from '@/theme';
import * as hoursRepo from '@/features/hours/repo';
import type { HourCategoryRow } from '@/features/hours/types';

// Medium-saturation colors that read clearly on both dark and light surfaces
const PICKER_COLORS = [
  '#6FA882', '#6A9FB5', '#9B87C0', '#C47A7A', '#D4956A',
  '#B8A44C', '#7EB5C5', '#C4A882', '#8FA8B8', '#9A9A9A',
  '#5B9E6E', '#5889A0', '#7A6AAD', '#B86060', '#C07840',
  '#9A8830', '#5FA0B0', '#A88860', '#7090A8', '#808080',
];

type EditingRow = { id: string | null; label: string; color: string };

export default function HourCategoriesScreen() {
  const router = useRouter();
  const colors = useColors();
  const [categories, setCategories] = useState<HourCategoryRow[]>([]);
  const [editing, setEditing] = useState<EditingRow | null>(null);
  const [saving, setSaving] = useState(false);
  const labelRef = useRef('');

  const load = useCallback(async () => {
    setCategories(await hoursRepo.listCategories());
  }, []);

  useEffect(() => { load(); }, [load]);

  const startAdd = () => {
    labelRef.current = '';
    setEditing({ id: null, label: '', color: PICKER_COLORS[0] });
  };

  const startEdit = (cat: HourCategoryRow) => {
    labelRef.current = cat.label;
    setEditing({ id: cat.id, label: cat.label, color: cat.color });
  };

  const cancelEdit = () => setEditing(null);

  const handleSave = async () => {
    if (!editing) return;
    const label = editing.label.trim();
    if (!label) return;
    setSaving(true);
    try {
      if (editing.id) {
        await hoursRepo.updateCategory(editing.id, label, editing.color);
      } else {
        await hoursRepo.addCategory(label, editing.color);
      }
      await load();
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: HourCategoryRow) => {
    Alert.alert(
      'Delete category',
      `Remove "${cat.label}"? Existing blocks using it will lose the category colour.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await hoursRepo.deleteCategory(cat.id);
            await load();
          },
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Hour tracker
            </Text>
            <Text variant="h1" style={{ marginTop: 2 }}>Categories</Text>
          </View>
          <Pressable
            onPress={startAdd}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.text, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Plus size={16} color={colors.bg} strokeWidth={2} />
            <Text variant="smallMedium" color={colors.bg}>New</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 80 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {/* Add / Edit form */}
          {editing ? (
            <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
              <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>
                {editing.id ? 'EDIT CATEGORY' : 'NEW CATEGORY'}
              </Text>

              {/* Name input */}
              <StableTextInput
                value={editing.label}
                onChangeText={(t) => {
                  labelRef.current = t;
                  setEditing((prev) => prev ? { ...prev, label: t } : null);
                }}
                placeholder="Category name"
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.accent}
                importantForAutofill="no"
                style={[styles.nameInput, {
                  color: colors.text,
                  borderColor: colors.hairline,
                  backgroundColor: colors.bg,
                }]}
                autoFocus
              />

              {/* Color picker */}
              <Text variant="caption" color={colors.textMuted} style={styles.sectionLabel}>COLOUR</Text>
              <View style={styles.colorGrid}>
                {PICKER_COLORS.map((c) => {
                  const selected = editing.color === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setEditing((prev) => prev ? { ...prev, color: c } : null)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        selected && styles.colorSwatchSelected,
                      ]}
                    >
                      {selected ? <Check size={14} color="#fff" strokeWidth={2.5} /> : null}
                    </Pressable>
                  );
                })}
              </View>

              {/* Preview */}
              <View style={[styles.preview, { backgroundColor: editing.color + '33', borderColor: editing.color }]}>
                <View style={[styles.previewDot, { backgroundColor: editing.color }]} />
                <Text variant="bodyMedium" style={{ color: editing.color }}>
                  {editing.label || 'Preview'}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.formActions}>
                <Pressable
                  onPress={cancelEdit}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text variant="bodyMedium" color={colors.textSoft}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={saving || !editing.label.trim()}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.text, opacity: pressed || saving || !editing.label.trim() ? 0.5 : 1 },
                  ]}
                >
                  <Text variant="bodyMedium" color={colors.bg}>
                    {saving ? 'Saving…' : editing.id ? 'Save' : 'Add'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Category list */}
          <View style={styles.list}>
            {categories.map((cat) => (
              <View
                key={cat.id}
                style={[styles.catRow, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
              >
                <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                <Text variant="bodyMedium" style={{ flex: 1 }}>{cat.label}</Text>
                <Pressable
                  onPress={() => startEdit(cat)}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
                >
                  <Pencil size={16} color={colors.textMuted} strokeWidth={1.75} />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(cat)}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
                >
                  <Trash2 size={16} color="#B97A6B" strokeWidth={1.75} />
                </Pressable>
              </View>
            ))}

            {categories.length === 0 && !editing ? (
              <Text variant="body" color={colors.textMuted} style={{ textAlign: 'center', marginTop: spacing.xl }}>
                No categories yet. Tap "New" to create one.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5 },
  nameInput: {
    fontFamily: fonts.sans,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    height: 52,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    transform: [{ scale: 1.15 }],
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  previewDot: { width: 10, height: 10, borderRadius: 5 },
  formActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: spacing.sm },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  catDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
