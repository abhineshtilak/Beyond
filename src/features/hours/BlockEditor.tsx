import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { Sheet, SheetRef } from '@/components/Sheet';
import { SheetInput } from '@/components/SheetInput';
import { useInputRef } from '@/lib/useInputRef';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import { formatHour, type TimeBlock, type HourCategoryRow } from './types';
import * as repo from './repo';

export type BlockEditorRef = {
  present: (date: string, hour: number, onSaved: () => void) => void;
  dismiss: () => void;
};

const DURATIONS = [15, 30, 45, 60];

export const BlockEditor = forwardRef<BlockEditorRef>(function BlockEditor(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const colors = useColors();
  const dateRef = useRef('');
  const hourRef = useRef(0);
  const onSavedRef = useRef<() => void>(() => {});

  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [categories, setCategories] = useState<HourCategoryRow[]>([]);

  const {
    valueRef: activityRef,
    snapshot: activitySnapshot,
    hasContent: hasActivity,
    onChangeText: onActivityChange,
    reset: resetActivity,
  } = useInputRef('');
  const [category, setCategory] = useState<string | null>(null);
  const [durationMins, setDurationMins] = useState(60);
  const [saving, setSaving] = useState(false);

  // Auto-detect next start minute from the last block added this hour
  const nextStartMin = useMemo(() => {
    if (blocks.length === 0) return 0;
    const sorted = [...blocks].sort((a, b) => a.startMinute - b.startMinute);
    const last = sorted[sorted.length - 1];
    const next = last.startMinute + last.durationMins;
    return next >= 60 ? 0 : next;
  }, [blocks]);

  const refreshBlocks = useCallback(async () => {
    const bks = await repo.listBlocksForHour(dateRef.current, hourRef.current);
    setBlocks(bks);
  }, []);

  const present = useCallback(async (date: string, hour: number, onSaved: () => void) => {
    dateRef.current = date;
    hourRef.current = hour;
    onSavedRef.current = onSaved;
    resetActivity('');
    setCategory(null);
    setDurationMins(60);
    const [cats, bks] = await Promise.all([
      repo.listCategories(),
      repo.listBlocksForHour(date, hour),
    ]);
    setCategories(cats);
    setBlocks(bks);
    sheetRef.current?.present();
  }, [resetActivity]);

  useImperativeHandle(ref, () => ({
    present,
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleAdd = async () => {
    if (!activityRef.current.trim()) return;
    setSaving(true);
    try {
      await repo.addBlock({
        logDate: dateRef.current,
        startHour: hourRef.current,
        startMinute: nextStartMin,
        durationMins,
        activity: activityRef.current.trim(),
        category,
      });
      onSavedRef.current();
      await refreshBlocks();
      resetActivity('');
      // Keep category selected — makes it easy to add several blocks of same type
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await repo.deleteBlock(id);
    onSavedRef.current();
    await refreshBlocks();
  };

  const getCatColor = (catId: string | null) =>
    catId ? (categories.find((c) => c.id === catId)?.color ?? colors.hairline) : colors.hairline;

  const getCatLabel = (catId: string | null) =>
    catId ? (categories.find((c) => c.id === catId)?.label ?? catId) : '';

  const hour = hourRef.current;

  return (
    <Sheet
      ref={sheetRef}
      title={`${formatHour(hour)} – ${formatHour((hour + 1) % 24)}`}
      snapPoints={['80%']}
      footer={
        <Button
          label="Add"
          onPress={handleAdd}
          loading={saving}
          disabled={!hasActivity}
        />
      }
    >
      {/* ── Existing blocks ─────────────────────────────────────────────── */}
      {blocks.map((b) => {
        const barColor = getCatColor(b.category);
        const catLabel = getCatLabel(b.category);
        const durLabel = b.durationMins < 60 ? `${b.durationMins}m` : `${b.durationMins / 60}h`;
        return (
          <View
            key={b.id}
            style={[
              styles.blockRow,
              { backgroundColor: barColor + '18', borderColor: barColor + '55' },
            ]}
          >
            <View style={[styles.colorBar, { backgroundColor: barColor }]} />
            <View style={styles.blockInfo}>
              <Text variant="bodyMedium" numberOfLines={1}>{b.activity}</Text>
              <Text variant="caption" color={colors.textMuted}>
                {durLabel}{catLabel ? ` · ${catLabel}` : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => handleDelete(b.id)}
              hitSlop={12}
              style={({ pressed }) => [
                styles.deleteBtn,
                { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <X size={13} color={colors.textMuted} strokeWidth={2.5} />
            </Pressable>
          </View>
        );
      })}

      {blocks.length > 0 && (
        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
      )}

      {/* ── Add form — always visible ───────────────────────────────────── */}
      <SheetInput
        label="What happened?"
        placeholder="e.g. deep work, gym, lunch…"
        value={activitySnapshot}
        onChangeText={onActivityChange}
        autoFocus={blocks.length === 0}
      />

      {/* Category chips */}
      <View style={styles.chipRow}>
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            selected={category === c.id}
            tint={c.color}
            onPress={() => setCategory(category === c.id ? null : c.id)}
          />
        ))}
      </View>

      {/* Duration chips + auto start hint */}
      <View style={styles.durationRow}>
        <View style={styles.chipRow}>
          {DURATIONS.map((d) => (
            <Chip
              key={d}
              label={d < 60 ? `${d}m` : '1h'}
              selected={durationMins === d}
              onPress={() => setDurationMins(d)}
            />
          ))}
        </View>
        <Text variant="caption" color={colors.textFaint} style={styles.startHint}>
          starts :{nextStartMin.toString().padStart(2, '0')}
        </Text>
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  blockInfo: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  startHint: {
    marginLeft: 'auto',
  },
});
