import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, TextInput, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Plus, X, Flag } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { Checkbox } from '@/components/Checkbox';
import { colors, radii, spacing, typeScale } from '@/theme';
import * as repo from './repo';
import type { Milestone } from './types';

type Props = {
  goalId: string;
  onProgressChange?: () => void;
};

export function MilestonesSection({ goalId, onProgressChange }: Props) {
  const [items, setItems] = useState<Milestone[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const reload = useCallback(async () => {
    const list = await repo.listMilestones(goalId);
    setItems(list);
  }, [goalId]);

  useEffect(() => { reload(); }, [reload]);

  const handleAdd = async () => {
    if (!draft.trim()) {
      setAdding(false);
      return;
    }
    await repo.addMilestone(goalId, draft.trim());
    setDraft('');
    setAdding(false);
    await reload();
    onProgressChange?.();
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

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Flag size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
            Milestones
          </Text>
          {total > 0 ? (
            <Text variant="caption" color={colors.textMuted}>· {done}/{total}</Text>
          ) : null}
        </View>
      </View>

      {items.length === 0 && !adding ? (
        <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
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
                  color: m.done ? colors.textMuted : colors.text,
                  textDecorationLine: m.done ? 'line-through' : 'none',
                }}
              >
                {m.title}
              </Text>
              <Pressable onPress={() => handleDelete(m.id)} hitSlop={8}>
                <X size={16} color={colors.textFaint} strokeWidth={1.75} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {adding ? (
        <View style={[styles.row, styles.addRow]}>
          <View style={styles.fakeBox} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="New milestone..."
            placeholderTextColor={colors.textFaint}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            onBlur={handleAdd}
            style={[typeScale.body, { color: colors.text, flex: 1, paddingVertical: 0 }]}
          />
        </View>
      ) : null}

      <Pressable
        onPress={() => setAdding(true)}
        style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
      >
        <Plus size={16} color={colors.textSoft} strokeWidth={2} />
        <Text variant="smallMedium" color={colors.textSoft}>Add milestone</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
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
    borderColor: colors.hairline,
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
