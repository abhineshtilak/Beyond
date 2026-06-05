/**
 * SkillsSection — chip-based skills list
 * Sits alongside MilestonesSection on the goal detail screen.
 * Skills are stored as comma-separated text in goal.skillsNeeded.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, TextInput } from 'react-native';
import { GraduationCap, Plus, X } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { StableTextInput } from '@/components/StableTextInput';
import { fonts, radii, spacing, useColors } from '@/theme';
import type { Goal, GoalInput } from './types';

type Props = {
  goal: Goal;
  onUpdate: (patch: Partial<GoalInput>) => Promise<void>;
};

export function SkillsSection({ goal, onUpdate }: Props) {
  const colors   = useColors();
  const [adding, setAdding]  = useState(false);
  const draftRef = useRef('');
  const inputRef = useRef<TextInput>(null);

  const skills = (goal.skillsNeeded ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);

  useEffect(() => {
    if (!adding) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [adding]);

  const remove = async (idx: number) => {
    const next = skills.filter((_, i) => i !== idx).join(', ') || null;
    await onUpdate({ skillsNeeded: next });
  };

  const add = async () => {
    const s = draftRef.current.trim();
    draftRef.current = '';
    setAdding(false);
    if (!s) return;
    const next = [...skills, s].join(', ');
    await onUpdate({ skillsNeeded: next });
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={styles.head}>
        <GraduationCap size={14} color={colors.textMuted} strokeWidth={1.6} />
        <Text variant="caption" color={colors.textMuted} style={styles.headLabel}>SKILLS</Text>
        {skills.length > 0 && (
          <Text variant="caption" color={colors.textFaint}>· {skills.length}</Text>
        )}
      </View>

      <View style={styles.chips}>
        {skills.map((s, i) => (
          <Pressable
            key={i}
            onPress={() => remove(i)}
            style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}
          >
            <Text variant="small" color={colors.textSoft}>{s}</Text>
            <X size={10} color={colors.textFaint} strokeWidth={2} />
          </Pressable>
        ))}

        {adding ? (
          <View style={[styles.chipInput, { borderColor: colors.accent, backgroundColor: colors.surfaceAlt }]}>
            <StableTextInput
              ref={inputRef}
              defaultValue=""
              onChangeText={(t) => { draftRef.current = t; }}
              onSubmitEditing={add}
              onBlur={add}
              placeholder="skill…"
              placeholderTextColor={colors.textFaint}
              autoCorrect={false}
              returnKeyType="done"
              style={{
                fontFamily: fonts.sans, fontSize: 13,
                color: colors.text, minWidth: 64, maxWidth: 120, padding: 0,
              }}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => setAdding(true)}
            style={[styles.addChip, { borderColor: colors.hairline }]}
          >
            <Plus size={12} color={colors.textFaint} strokeWidth={2} />
            <Text variant="caption" color={colors.textFaint}>add</Text>
          </Pressable>
        )}
      </View>

      {skills.length === 0 && !adding && (
        <Text variant="small" color={colors.textFaint} style={{ marginTop: spacing.xs }}>
          What do you need to learn for this goal?
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg, borderWidth: 1,
    padding: spacing.lg, paddingBottom: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  headLabel: { letterSpacing: 0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radii.pill, borderWidth: 1,
  },
  chipInput: {
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radii.pill, borderWidth: 1,
  },
  addChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radii.pill, borderWidth: 1, borderStyle: 'dashed',
  },
});
