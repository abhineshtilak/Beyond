import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Sheet, SheetRef } from '@/components/Sheet';
import { SheetInput } from '@/components/SheetInput';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import * as interactionsRepo from './interactions';
import {
  MOOD_META, MEDIUM_META,
  type InteractionMood, type InteractionMedium,
} from './types';

const MOODS: InteractionMood[] = ['great', 'good', 'ok', 'distant', 'conflict'];
const MEDIUMS: InteractionMedium[] = ['met_in_person', 'call', 'text', 'online'];

export type InteractionSheetRef = {
  present: (personId: string, onLogged: () => void) => void;
  dismiss: () => void;
};

export const InteractionSheet = forwardRef<InteractionSheetRef>(function InteractionSheet(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const colors = useColors();
  const personIdRef = useRef<string>('');
  const onLoggedRef = useRef<() => void>(() => {});

  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState<InteractionMood | null>(null);
  const [medium, setMedium] = useState<InteractionMedium | null>(null);
  const [saving, setSaving] = useState(false);

  const present = useCallback((personId: string, onLogged: () => void) => {
    personIdRef.current = personId;
    onLoggedRef.current = onLogged;
    setNotes('');
    setMood(null);
    setMedium(null);
    sheetRef.current?.present();
  }, []);

  useImperativeHandle(ref, () => ({
    present,
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await interactionsRepo.logInteraction(personIdRef.current, {
        notes: notes.trim() || null,
        mood,
        medium,
      });
      onLoggedRef.current();
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      ref={sheetRef}
      title="Log interaction"
      subtitle="How did it go?"
      snapPoints={['72%']}
      footer={<Button label="Log it" onPress={handleSave} loading={saving} />}
    >
      {/* Mood */}
      <View style={styles.group}>
        <Text variant="caption" color={colors.textMuted} style={styles.groupLabel}>HOW WAS IT?</Text>
        <View style={styles.chipRow}>
          {MOODS.map((m) => {
            const meta = MOOD_META[m];
            const selected = mood === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMood(mood === m ? null : m)}
                style={({ pressed }) => [
                  styles.moodChip,
                  {
                    backgroundColor: selected ? meta.color : colors.surface,
                    borderColor: selected ? 'transparent' : colors.hairline,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
                <Text
                  variant="smallMedium"
                  color={selected ? '#fff' : colors.textSoft}
                >
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Medium */}
      <View style={styles.group}>
        <Text variant="caption" color={colors.textMuted} style={styles.groupLabel}>HOW DID YOU CONNECT?</Text>
        <View style={styles.chipRow}>
          {MEDIUMS.map((med) => {
            const meta = MEDIUM_META[med];
            const selected = medium === med;
            return (
              <Pressable
                key={med}
                onPress={() => setMedium(medium === med ? null : med)}
                style={({ pressed }) => [
                  styles.moodChip,
                  {
                    backgroundColor: selected ? colors.text : colors.surface,
                    borderColor: selected ? 'transparent' : colors.hairline,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
                <Text
                  variant="smallMedium"
                  color={selected ? colors.bg : colors.textSoft}
                >
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Notes */}
      <SheetInput
        label="Notes"
        placeholder="What did you talk about? Anything to remember?"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
    </Sheet>
  );
});

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  groupLabel: { textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
