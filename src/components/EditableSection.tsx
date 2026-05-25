import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronRight, Plus, Check } from 'lucide-react-native';
import { Text } from './Text';
import { StableTextInput } from './StableTextInput';
import { fonts, radii, spacing, useColors } from '@/theme';

type Props = {
  label: string;
  value?: string | null;
  placeholder: string;
  /**
   * Called when the user finishes editing (input blurred or "Done" tapped).
   * Receives the trimmed value or null if empty.
   */
  onSave: (value: string | null) => Promise<void> | void;
  tint?: string;
  serif?: boolean;
  /**
   * Optional. Called when entering edit mode, so the parent can scroll
   * this section into view above the keyboard.
   */
  onEditStart?: () => void;
};

export function EditableSection({
  label, value, placeholder, onSave, tint, serif, onEditStart,
}: Props) {
  const colors = useColors();
  const [editing, setEditing] = useState(false);
  // draft lives in a ref — typing never re-renders this component,
  // which is critical for smooth IME behaviour on Android.
  const draftRef = useRef(value ?? '');
  // Guard so blur + Done press don't both try to save.
  const savingRef = useRef(false);

  // Keep the draft in sync with external value while NOT editing.
  useEffect(() => {
    if (!editing) draftRef.current = value ?? '';
  }, [value, editing]);

  const filled = !!(value && value.trim());

  const finishEdit = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setEditing(false);
    try {
      const trimmed = draftRef.current.trim();
      const prev = (value ?? '').trim();
      if (trimmed !== prev) {
        await onSave(trimmed || null);
      }
    } finally {
      savingRef.current = false;
    }
  };

  if (editing) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: tint ?? colors.surface,
            borderColor: colors.accent,
          },
        ]}
      >
        <View style={styles.head}>
          <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
            {label}
          </Text>
          <Pressable
            onPress={finishEdit}
            hitSlop={10}
            style={({ pressed }) => [
              styles.doneBtn,
              { backgroundColor: colors.text },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Check size={12} color={colors.bg} strokeWidth={2.5} />
            <Text variant="caption" color={colors.bg}>DONE</Text>
          </Pressable>
        </View>
        <StableTextInput
          // defaultValue (read on mount) — typing does NOT re-render
          // this component because draft lives in a ref.
          defaultValue={draftRef.current}
          onChangeText={(t) => { draftRef.current = t; }}
          onBlur={finishEdit}
          autoFocus
          autoCorrect={false}
          multiline
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.accent}
          importantForAutofill="no"
          style={{
            marginTop: spacing.sm,
            fontFamily: serif ? fonts.serif : fonts.sans,
            fontSize: serif ? 18 : 15,
            lineHeight: serif ? 26 : 22,
            color: colors.text,
            minHeight: 80,
            textAlignVertical: 'top',
            padding: 0,
          }}
        />
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        draftRef.current = value ?? '';
        setEditing(true);
        onEditStart?.();
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: tint ?? colors.surface,
          borderColor: colors.hairline,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.head}>
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
          {label}
        </Text>
        {filled ? (
          <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.75} />
        ) : (
          <View style={[styles.addBadge, { backgroundColor: colors.surfaceAlt }]}>
            <Plus size={12} color={colors.textSoft} strokeWidth={2} />
            <Text variant="caption" color={colors.textSoft}>ADD</Text>
          </View>
        )}
      </View>
      <Text
        variant={serif ? 'h3' : 'body'}
        color={filled ? colors.text : colors.textMuted}
        style={{ marginTop: spacing.sm, lineHeight: serif ? 26 : 22 }}
      >
        {filled ? value : placeholder}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
});
