import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { StableTextInput } from '@/components/StableTextInput';
import * as Haptics from 'expo-haptics';
import { Plus, X, Flag } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { Checkbox } from '@/components/Checkbox';
import { fonts, radii, spacing, useColors } from '@/theme';
import * as repo from './repo';
import type { Milestone } from './types';

type Props = {
  goalId: string;
  onProgressChange?: () => void;
};

export function MilestonesSection({ goalId, onProgressChange }: Props) {
  const themed = useColors();
  const [items, setItems] = useState<Milestone[]>([]);
  const [adding, setAdding] = useState(false);
  // Draft text in a ref → typing does NOT re-render this component.
  const draftRef = useRef('');
  const submitting = useRef(false);

  const reload = useCallback(async () => {
    const list = await repo.listMilestones(goalId);
    setItems(list);
  }, [goalId]);

  useEffect(() => { reload(); }, [reload]);

  const handleAdd = async () => {
    const text = draftRef.current.trim();
    if (!text || submitting.current) {
      if (!text) setAdding(false);
      return;
    }
    submitting.current = true;
    try {
      await repo.addMilestone(goalId, text);
      draftRef.current = '';
      setAdding(false);
      await reload();
      onProgressChange?.();
    } finally {
      submitting.current = false;
    }
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

  const total = items.length;
  const done = items.filter((m) => m.done).length;

  const dynamicStyles = useMemo(() => ({
    wrap: {
      backgroundColor: themed.surface,
      borderColor: themed.hairline,
    },
    fakeBox: {
      borderColor: themed.hairline,
    },
    inputText: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: themed.text,
      flex: 1,
      paddingVertical: 0,
    } as const,
  }), [themed]);

  return (
    <View style={[styles.wrap, dynamicStyles.wrap]}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Flag size={14} color={themed.textMuted} strokeWidth={1.75} />
          <Text variant="caption" color={themed.textMuted} style={{ textTransform: 'uppercase' }}>
            Milestones
          </Text>
          {total > 0 ? (
            <Text variant="caption" color={themed.textMuted}>· {done}/{total}</Text>
          ) : null}
        </View>
      </View>

      {items.length === 0 && !adding ? (
        <Text variant="body" color={themed.textMuted} style={{ marginTop: spacing.sm }}>
          Break the goal into clear, reachable steps.
        </Text>
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {items.map((m) => (
            <View key={m.id} style={styles.row}>
              <Checkbox checked={m.done} onToggle={() => handleToggle(m.id)} size={22} />
              <Text
                variant="body"
                style={{
                  flex: 1,
                  color: m.done ? themed.textMuted : themed.text,
                  textDecorationLine: m.done ? 'line-through' : 'none',
                }}
              >
                {m.title}
              </Text>
              <Pressable onPress={() => handleDelete(m.id)} hitSlop={8}>
                <X size={16} color={themed.textFaint} strokeWidth={1.75} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {adding ? (
        <View style={[styles.row, styles.addRow]}>
          <View style={[styles.fakeBox, dynamicStyles.fakeBox]} />
          <StableTextInput
            // defaultValue → typing won't re-render the section.
            defaultValue=""
            onChangeText={(t) => { draftRef.current = t; }}
            placeholder="New milestone..."
            placeholderTextColor={themed.textFaint}
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            onBlur={handleAdd}
            style={dynamicStyles.inputText}
          />
        </View>
      ) : null}

      <Pressable
        onPress={() => setAdding(true)}
        style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
      >
        <Plus size={16} color={themed.textSoft} strokeWidth={2} />
        <Text variant="smallMedium" color={themed.textSoft}>Add milestone</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  addRow: { paddingVertical: 4 },
  fakeBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
});
