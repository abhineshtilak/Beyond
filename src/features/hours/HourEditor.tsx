import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Sheet, SheetRef } from '@/components/Sheet';
import { SheetInput as Input } from '@/components/SheetInput';
import { useInputRef } from '@/lib/useInputRef';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { radii, spacing, useColors } from '@/theme';
import { useHoursStore } from './store';
import * as repo from './repo';
import { HOUR_CATEGORIES, HOUR_CATEGORY_META, formatHour, type HourCategory, type HourCategoryRow } from './types';

export type HourEditorRef = {
  present: (hour: number, currentActivity?: string, currentCategory?: string | null) => void;
  dismiss: () => void;
};

export const HourEditor = forwardRef<HourEditorRef>(function HourEditor(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const colors = useColors();
  const upsert = useHoursStore((s) => s.upsert);
  const clear = useHoursStore((s) => s.clear);
  const date = useHoursStore((s) => s.date);

  const [hour, setHour] = useState<number>(0);
  const {
    valueRef: activityRef,
    snapshot: activitySnapshot,
    onChangeText: onActivityChange,
    reset: resetActivity,
  } = useInputRef('');
  const [category, setCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [existed, setExisted] = useState(false);
  const [customCategories, setCustomCategories] = useState<HourCategoryRow[]>([]);

  const reset = useCallback(async (h: number, act?: string, cat?: string | null) => {
    setHour(h);
    resetActivity(act ?? '');
    setCategory(cat ?? null);
    setExisted(!!(act || cat));
    // Load custom categories fresh every time the editor opens
    const cats = await repo.listCategories();
    setCustomCategories(cats);
  }, [resetActivity]);

  useImperativeHandle(ref, () => ({
    present: (h, act, cat) => {
      reset(h, act, cat);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsert(hour, activityRef.current, category);
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    await clear(hour);
    sheetRef.current?.dismiss();
  };

  return (
    <Sheet
      ref={sheetRef}
      title={`${formatHour(hour)} – ${formatHour((hour + 1) % 24)}`}
      subtitle={date ? `What did this hour become?` : undefined}
      snapPoints={['92%']}
      footer={<Button label="Save" onPress={handleSave} loading={saving} />}
    >
      <Input
        label="Activity"
        placeholder="e.g. Wrote three pages, gym, coffee with Sara"
        value={activitySnapshot}
        onChangeText={onActivityChange}
        autoFocus
      />

      <View style={styles.section}>
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
          Category
        </Text>
        <View style={styles.chipRow}>
          {/* Built-in categories */}
          {HOUR_CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={HOUR_CATEGORY_META[c].label}
              tint={HOUR_CATEGORY_META[c].tint}
              selected={category === c}
              size="sm"
              onPress={() => setCategory(category === c ? null : c)}
            />
          ))}
          {/* Custom categories from DB */}
          {customCategories.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              tint={c.color}
              selected={category === c.id}
              size="sm"
              onPress={() => setCategory(category === c.id ? null : c.id)}
            />
          ))}
        </View>
      </View>

      {existed ? (
        <Pressable onPress={handleClear} style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}>
          <Trash2 size={16} color="#B97A6B" strokeWidth={1.75} />
          <Text variant="bodyMedium" color="#B97A6B">Clear this hour</Text>
        </Pressable>
      ) : null}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.lg, marginTop: spacing.sm,
    borderRadius: radii.lg, borderWidth: 1,
    borderColor: '#E8D0CB', backgroundColor: '#F7E9E5',
  },
});
