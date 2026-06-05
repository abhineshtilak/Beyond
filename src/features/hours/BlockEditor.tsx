import React, {
  forwardRef,
  useCallback,
  useEffect,
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

const STD_DURATIONS = [15, 30, 45, 60];

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
  const [saving, setSaving] = useState(false);

  // ── Capacity math ──────────────────────────────────────────────────────────
  // When editing a block we exclude it from "used" so we're computing how much
  // space the OTHER blocks occupy, and the remaining space for this block.
  const { minutesUsed, minutesRemaining, nextStartMin } = useMemo(() => {
    const other = editing ? blocks.filter((b) => b.id !== editing.id) : blocks;
    const used = other.reduce((s, b) => s + b.durationMins, 0);
    const remaining = Math.max(0, 60 - used);

    let nextStart = 0;
    if (other.length > 0) {
      const sorted = [...other].sort((a, b) => a.startMinute - b.startMinute);
      const last = sorted[sorted.length - 1];
      nextStart = last.startMinute + last.durationMins;
    }
    if (editing) nextStart = editing.startMinute;

    return { minutesUsed: used, minutesRemaining: remaining, nextStartMin: nextStart };
  }, [blocks, editing]);

  // Only show duration chips that actually fit in the remaining slot.
  // Also expose the exact remaining value if it's not a standard multiple.
  const availableDurations = useMemo(() => {
    if (editing) return STD_DURATIONS; // editing can choose any; capped at save
    const fits = STD_DURATIONS.filter((d) => d <= minutesRemaining);
    if (minutesRemaining > 0 && minutesRemaining < 60 && !fits.includes(minutesRemaining)) {
      return [...fits, minutesRemaining].sort((a, b) => a - b);
    }
    return fits;
  }, [minutesRemaining, editing]);

  // Clamp selected duration whenever the slot changes
  useEffect(() => {
    if (editing) return;
    if (availableDurations.length > 0 && !availableDurations.includes(durationMins)) {
      setDurationMins(availableDurations[availableDurations.length - 1]);
    }
  }, [availableDurations, durationMins, editing]);

  const refreshBlocks = useCallback(async () => {
    const bks = await repo.listBlocksForHour(dateRef.current, hourRef.current);
    setBlocks(bks);
  }, []);

  const enterEdit = useCallback(
    (block: TimeBlock) => {
      setEditing(block);
      resetActivity(block.activity);
      setCategory(block.category);
      setDurationMins(block.durationMins);
    },
    [resetActivity],
  );

  const cancelEdit = useCallback(() => {
    setEditing(null);
    resetActivity('');
    setCategory(null);
    setDurationMins(60);
  }, [resetActivity]);

  const present = useCallback(
    async (date: string, hour: number, onSaved: () => void) => {
      dateRef.current = date;
      hourRef.current = hour;
      onSavedRef.current = onSaved;
      setEditing(null);
      resetActivity('');
      setCategory(null);
      const [cats, bks] = await Promise.all([
        repo.listCategories(),
        repo.listBlocksForHour(date, hour),
      ]);
      setCategories(cats);
      setBlocks(bks);
      // Pre-select the best fitting standard duration (or exact remainder)
      const used = bks.reduce((s, b) => s + b.durationMins, 0);
      const rem = Math.max(0, 60 - used);
      const std = STD_DURATIONS.filter((d) => d <= rem);
      setDurationMins(rem > 0 ? (std[std.length - 1] ?? rem) : 60);
      sheetRef.current?.present();
    },
    [resetActivity],
  );

  useImperativeHandle(ref, () => ({
    present,
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    if (!activityRef.current.trim()) return;
    if (!editing && minutesRemaining <= 0) return; // hour full
    const effectiveDur = editing
      ? durationMins
      : Math.min(durationMins, minutesRemaining);
    setSaving(true);
    try {
      if (editing) {
        await repo.updateBlock(editing.id, {
          activity: activityRef.current.trim(),
          category,
          startMinute: editing.startMinute,
          durationMins: effectiveDur,
        });
        setEditing(null);
      } else {
        const added = await repo.addBlock({
          logDate: dateRef.current,
          startHour: hourRef.current,
          startMinute: nextStartMin,
          durationMins: effectiveDur,
          activity: activityRef.current.trim(),
          category,
        });
        if (!added) return; // hour was full, nothing saved
      }
      onSavedRef.current();
      await refreshBlocks();
      resetActivity('');
      // Keep category selected for quick multi-add of same type
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
  const hourFull = minutesRemaining <= 0 && !editing;
  const fillPct = Math.min(1, minutesUsed / 60);

  return (
    <Sheet
      ref={sheetRef}
      title={`${formatHour(hour)} – ${formatHour((hour + 1) % 24)}`}
      snapPoints={['60%', '92%']}
      footer={
        !hourFull ? (
          <Button
            label={editing ? 'Save changes' : 'Add block'}
            onPress={handleSave}
            loading={saving}
            disabled={!hasActivity || (!editing && minutesRemaining <= 0)}
          />
        ) : undefined
      }
    >
      {/* ── Capacity bar ──────────────────────────────────────────────────── */}
      <View style={styles.capacityRow}>
        <View style={[styles.progressBg, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${fillPct * 100}%`, backgroundColor: hourFull ? '#6FA882' : colors.text },
            ]}
          />
        </View>
        <Text variant="caption" color={hourFull ? '#6FA882' : colors.textMuted}>
          {hourFull
            ? '✓ Hour complete'
            : minutesUsed === 0
            ? '60 min to fill'
            : `${minutesRemaining} min remaining`}
        </Text>
      </View>

      {/* ── Existing blocks ───────────────────────────────────────────────── */}
      {blocks.map((b) => {
        const barColor = getCatColor(b.category);
        const catLabel = getCatLabel(b.category);
        const durLabel = b.durationMins < 60 ? `${b.durationMins}m` : '1h';
        const isBeingEdited = editing?.id === b.id;
        return (
          <View
            key={b.id}
            style={[
              styles.blockRow,
              {
                backgroundColor: isBeingEdited ? barColor + '28' : colors.surface,
                borderColor: isBeingEdited ? barColor : colors.hairline,
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
            {/* Edit toggle */}
            <Pressable
              onPress={() => (isBeingEdited ? cancelEdit() : enterEdit(b))}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: isBeingEdited ? colors.text + '18' : colors.surfaceAlt },
                pressed && { opacity: 0.5 },
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
                styles.deleteBtn,
                { borderColor: colors.hairline, marginRight: spacing.sm },
                pressed && { opacity: 0.5 },
              ]}
            >
              <X size={13} color={colors.textMuted} strokeWidth={2.5} />
            </Pressable>
          </View>
        );
      })}

      {/* ── Add / edit form ───────────────────────────────────────────────── */}
      {!hourFull || editing ? (
        <>
          {blocks.length > 0 && (
            <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
          )}

          {editing ? (
            <View style={styles.editHeader}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                Editing — {editing.durationMins < 60 ? `${editing.durationMins}m` : '1h'} block
              </Text>
              <Pressable onPress={cancelEdit} hitSlop={8}>
                <Text variant="caption" color={colors.textMuted}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}

          <SheetInput
            label={editing ? 'Activity' : 'What did you do?'}
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

          {/* Duration chips — only options that fit */}
          {availableDurations.length > 0 ? (
            <View style={styles.durationRow}>
              <View style={styles.chipRow}>
                {availableDurations.map((d) => (
                  <Chip
                    key={d}
                    label={d < 60 ? `${d}m` : '1h'}
                    selected={durationMins === d}
                    onPress={() => setDurationMins(d)}
                  />
                ))}
              </View>
              {!editing ? (
                <Text variant="caption" color={colors.textFaint} style={styles.startHint}>
                  :{nextStartMin.toString().padStart(2, '0')}
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        /* Hour is 100% filled — only show edit affordance */
        <View style={[styles.fullMsg, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
          <Text variant="body" color={colors.textSoft} style={{ textAlign: 'center' }}>
            This hour is fully logged.{'\n'}Tap ✏ on a block to edit it.
          </Text>
        </View>
      )}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  capacityRow: {
    gap: spacing.xs,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
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
  deleteBtn: {
    borderWidth: 1,
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
  fullMsg: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },
});
