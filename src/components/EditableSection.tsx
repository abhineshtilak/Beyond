import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, TextInput, type ViewProps } from 'react-native';
import { ChevronRight, Plus, Check } from 'lucide-react-native';
import { Text } from './Text';
import { StableTextInput } from './StableTextInput';
import { fonts, radii, spacing, useColors } from '@/theme';

type Props = {
  label: string;
  value?: string | null;
  placeholder: string;
  onSave: (value: string | null) => Promise<void> | void;
  tint?: string;
  serif?: boolean;
  onEditStart?: () => void;
  onLayout?: ViewProps['onLayout'];
};

export function EditableSection({
  label, value, placeholder, onSave, tint, serif, onEditStart, onLayout,
}: Props) {
  const colors = useColors();
  const [editing, setEditing] = useState(false);
  const draftRef = useRef(value ?? '');
  const savingRef = useRef(false);
  // Ref to the native input — we focus it manually (not via autoFocus)
  // so that layout settles before the keyboard appears.
  const inputRef = useRef<TextInput>(null);

  // Keep draft in sync with external value while not editing.
  useEffect(() => {
    if (!editing) draftRef.current = value ?? '';
  }, [value, editing]);

  // Focus AFTER layout — one rAF gives React time to commit the card-swap
  // layout before the keyboard animation starts. This is what separates the
  // layout reflow from the scroll animation, making both feel instant.
  useEffect(() => {
    if (!editing) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [editing]);

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
        onLayout={onLayout}
        style={[styles.card, { backgroundColor: tint ?? colors.surface, borderColor: colors.accent }]}
      >
        <View style={styles.head}>
          <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
            {label}
          </Text>
          <Pressable
            onPress={finishEdit}
            hitSlop={10}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: colors.text }, pressed && { opacity: 0.8 }]}
          >
            <Check size={12} color={colors.bg} strokeWidth={2.5} />
            <Text variant="caption" color={colors.bg}>DONE</Text>
          </Pressable>
        </View>
        <StableTextInput
          ref={inputRef}
          defaultValue={draftRef.current}
          onChangeText={(t) => { draftRef.current = t; }}
          onBlur={finishEdit}
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
      onLayout={onLayout}
      onPress={() => {
        draftRef.current = value ?? '';
        setEditing(true);
        onEditStart?.();
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tint ?? colors.surface, borderColor: colors.hairline },
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
