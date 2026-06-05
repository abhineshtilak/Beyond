/**
 * MilestonesSection — journey map UI
 *
 * Renders milestones as a vertical path:  start → checkpoints → goal
 * Done nodes fill in; current node glows; future nodes are empty.
 * The connecting spine fills with colour as you progress.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { StableTextInput } from '@/components/StableTextInput';
import * as Haptics from '@/lib/haptics';
import { Plus, Check, X } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { fonts, radii, spacing, useColors } from '@/theme';
import * as repo from './repo';
import type { Milestone } from './types';

type Props = {
  goalId: string;
  onProgressChange?: () => void;
};

export function MilestonesSection({ goalId, onProgressChange }: Props) {
  const colors = useColors();
  const [items,  setItems]  = useState<Milestone[]>([]);
  const [adding, setAdding] = useState(false);
  const draftRef   = useRef('');
  const submitting = useRef(false);

  const reload = useCallback(async () => {
    const list = await repo.listMilestones(goalId);
    setItems(list);
  }, [goalId]);

  useEffect(() => { reload(); }, [reload]);

  const handleAdd = async () => {
    const text = draftRef.current.trim();
    if (!text || submitting.current) { if (!text) setAdding(false); return; }
    submitting.current = true;
    try {
      await repo.addMilestone(goalId, text);
      draftRef.current = '';
      setAdding(false);
      await reload();
      onProgressChange?.();
    } finally { submitting.current = false; }
  };

  const handleToggle = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await repo.toggleMilestone(id);
    await reload();
    onProgressChange?.();
  };

  const handleDelete = async (id: string) => {
    await repo.deleteMilestone(id);
    await reload();
    onProgressChange?.();
  };

  const total    = items.length;
  const doneCount = items.filter((m) => m.done).length;
  // Index of first incomplete milestone
  const currentIdx = items.findIndex((m) => !m.done);

  // accent for the filled spine + done nodes
  const accent = '#9B87C0';
  const accentLight = '#9B87C022';

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      {/* ── Header ── */}
      <View style={styles.head}>
        <Text variant="caption" color={colors.textMuted} style={styles.headLabel}>
          MILESTONES
        </Text>
        {total > 0 && (
          <Text variant="caption" color={colors.textFaint}>
            {doneCount}/{total}
          </Text>
        )}
      </View>

      {/* ── Empty state ── */}
      {items.length === 0 && !adding && (
        <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Add steps — each one is a checkpoint on the way.
        </Text>
      )}

      {/* ── Journey path ── */}
      {items.length > 0 && (
        <View style={styles.path}>
          {items.map((m, idx) => {
            const isDone    = m.done;
            const isCurrent = !isDone && idx === currentIdx;
            const isLast    = idx === items.length - 1;

            const nodeColor   = isDone ? accent : isCurrent ? accent : colors.hairline;
            const spineColor  = isDone ? accent : colors.hairline;
            const textColor   = isDone ? colors.textMuted : isCurrent ? colors.text : colors.textSoft;

            return (
              <View key={m.id} style={styles.node}>
                {/* Spine above (skip for first) */}
                {idx > 0 && (
                  <View style={[styles.spineTop, { backgroundColor: items[idx - 1].done ? accent : colors.hairline }]} />
                )}

                {/* Node row */}
                <View style={styles.nodeRow}>
                  {/* Circle */}
                  <Pressable
                    onPress={() => handleToggle(m.id)}
                    hitSlop={8}
                    style={[
                      styles.circle,
                      isDone
                        ? { backgroundColor: accent, borderColor: accent }
                        : isCurrent
                        ? { backgroundColor: accentLight, borderColor: accent, borderWidth: 2 }
                        : { backgroundColor: colors.bg, borderColor: colors.hairline, borderWidth: 1.5 },
                    ]}
                  >
                    {isDone
                      ? <Check size={11} color="#fff" strokeWidth={2.5} />
                      : isCurrent
                      ? <View style={[styles.innerDot, { backgroundColor: accent }]} />
                      : null}
                  </Pressable>

                  {/* Label */}
                  <Text
                    variant={isCurrent ? 'bodyMedium' : 'body'}
                    style={{
                      flex: 1,
                      color: textColor,
                      textDecorationLine: isDone ? 'line-through' : 'none',
                      lineHeight: 20,
                    }}
                  >
                    {m.title}
                  </Text>

                  {/* Delete */}
                  <Pressable onPress={() => handleDelete(m.id)} hitSlop={10}>
                    <X size={14} color={colors.textFaint} strokeWidth={1.75} />
                  </Pressable>
                </View>

                {/* Spine below (skip for last) */}
                {!isLast && (
                  <View style={[styles.spineBottom, { backgroundColor: spineColor }]} />
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ── Add input ── */}
      {adding && (
        <View style={[styles.addRow, { borderColor: colors.hairline }]}>
          <View style={[styles.circle, { backgroundColor: colors.bg, borderColor: colors.hairline, borderWidth: 1.5 }]} />
          <StableTextInput
            defaultValue=""
            onChangeText={(t) => { draftRef.current = t; }}
            placeholder="Next milestone…"
            placeholderTextColor={colors.textFaint}
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            onBlur={handleAdd}
            style={{
              flex: 1,
              fontFamily: fonts.sans,
              fontSize: 15,
              color: colors.text,
              paddingVertical: 0,
            }}
          />
        </View>
      )}

      {/* ── Add button ── */}
      <Pressable
        onPress={() => setAdding(true)}
        style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.65 }]}
      >
        <Plus size={14} color={colors.textFaint} strokeWidth={2} />
        <Text variant="caption" color={colors.textFaint}>Add step</Text>
      </Pressable>
    </View>
  );
}

const NODE_SIZE  = 22;
const SPINE_W    = 2;
const SPINE_H    = 20;

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headLabel: {
    letterSpacing: 0.6,
  },

  // Path
  path: { gap: 0 },
  node: { alignItems: 'flex-start' },

  spineTop: {
    width: SPINE_W,
    height: SPINE_H,
    marginLeft: (NODE_SIZE - SPINE_W) / 2,
  },
  spineBottom: {
    width: SPINE_W,
    height: SPINE_H,
    marginLeft: (NODE_SIZE - SPINE_W) / 2,
  },

  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },

  circle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  innerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // Add row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
});
