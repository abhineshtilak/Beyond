import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { X, Pencil } from 'lucide-react-native';
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
  const [editing, setEditing] = useState<TimeBlock | null>(null);

  const {
    valueRef: activityRef,
    snapshot: activitySnapshot,
    hasContent: hasActivity,
    onChangeText: onActivityChange,
    reset: resetActivity,
  } = useInputRef('');
  const [category, setCategory] = useState<string | null>(null);
  const [durationMins, setDurationMins] = useState(60);
  const [startMin, setStartMin] = useState(0);
  const [saving, setSaving] = useState(false);

  // Auto-detect next start minute from the last block added this hour
  const nextStartMin = useMemo(() => {
    if (editing) return editing.startMinute;
    if (blocks.length === 0) return 0;
    const sorted = [...blocks].sort((a, b) => a.startMinute - b.startMinute);
    const last = sorted[sorted.length - 1];
    const next = last.startMinute + last.durationMins;
    return next >= 60 ? 0 : next;
  }, [blocks, editing]);

  const refreshBlocks = useCallback(async () => {
    const bks = await repo.listBlocksForHour(dateRef.current, hourRef.current);
    setBlocks(bks);
  }, []);

  const enterEdit = useCallback((block: TimeBlock) => {
    setEditing(block);
    resetActivity(block.activity);
    setCategory(block.category);
    setDurationMins(block.durationMins);
    setStartMin(block.startMinute);
  }, [resetActivity]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    resetActivity('');
    setCategory(null);
    setDurationMins(60);
  }, [resetActivity]);

  const present = useCallback(async (date: string, hour: number, onSaved: () => void) => {
    dateRef.current = date;
    hourRef.current = hour;
    onSavedRef.current = onSaved;
    setEditing(null);
    resetActivity('');
    setCategory(null);
    setDurationMins(60);
    setStartMin(0);
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

  const handleSave = async () => {
    if (!activityRef.current.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await repo.updateBlock(editing.id, {
          activity: activityRef.current.trim(),
          category,
          startMinute: startMin,
          durationMins,
        });
        setEditing(null);
      } else {
        await repo.addBlock({
          logDate: dateRef.current,
          startHour: hourRef.current,
          startMinute: nextStartMin,
          durationMins,
          activity: activityRef.current.trim(),
          category,
        });
      }
      onSavedRef.current();
      await refreshBlocks();
      resetActivity('');
      // Keep category for quick multi-add of same type
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (editing?.id === id) cancelEdit();
    await repo.deleteBlock(id);
    onSavedRef.current();
    await refreshBlocks();
  };

  const getCatColor = (catId: string | null) =>
    catId ? (categories.find((c) => c.id === catId)?.color ?? colors.hairline) : colors.hairline;

  const getCatLabel = (catId: string | null) =>
    catId ? (categories.find((c) => c.id === catId)?.label ?? catId) : '';

  const hour = hourRef.current;
  const effectiveStartMin = editing ? startMin : nextStartMin;

  return (
    <Sheet
      ref={sheetRef}
      title={`${formatHour(hour)} – ${formatHour((hour + 1) % 24)}`}
      snapPoints={['80%']}
      footer={
        <Button
          label={editing ? 'Save changes' : 'Add'}
          onPress={handleSave}
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
        const isBeingEdited = editing?.id === b.id;
        return (
          <View
            key={b.id}
            style={[
              styles.blockRow,
              {
                backgroundColor: isBeingEdited
                  ? barColor + '30'
                  : barColor + '18',
                borderColor: isBeingEdited ? barColor : barColor + '55',
              },
            ]}
          >
            <View style={[styles.colorBar, { backgroundColor: barColor }]} />
            <View style={styles.blockInfo}>
              <Text variant="bodyMedium" numberOfLines={1}>{b.activity}</Text>
              <Text variant="caption" color={colors.textMuted}>
                {durLabel}{catLabel ? ` · ${catLabel}` : ''}
              </Text>
            </View>
            {/* Edit */}
            <Pressable
              onPress={() => isBeingEdited ? cancelEdit() : enterEdit(b)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: isBeingEdited ? colors.text + '18' : colors.surfaceAlt,
                  opacity: pressed ? 0.5 : 1,
                },
              ]}
            >
              <Pencil
                size={13}
                color={isBeingEdited ? colors.text : colors.textMuted}
                strokeWidth={2}
              />
            </Pressable>
            {/* Delete */}
            <Pressable
              onPress={() => handleDelete(b.id)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: '#F7E9E5', opacity: pressed ? 0.5 : 1, marginRight: spacing.sm },
              ]}
            >
              <X size={13} color="#B97A6B" strokeWidth={2.5} />
            </Pressable>
          </View>
        );
      })}

      {blocks.length > 0 && (
        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
      )}

      {/* ── Form header when editing ────────────────────────────────────── */}
      {editing ? (
        <View style={styles.editHeader}>
          <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
            Editing block
          </Text>
          <Pressable onPress={cancelEdit} hitSlop={8}>
            <Text variant="caption" color={colors.textMuted}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {/* ── Activity input — always visible ────────────────────────────── */}
      <SheetInput
        label={editing ? 'Activity' : 'What happened?'}
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

      {/* Duration chips + start hint */}
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
          starts :{effectiveStartMin.toString().padStart(2, '0')}
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
    paddingLeft: spacing.sm,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
