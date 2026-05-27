import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import * as Haptics from '@/lib/haptics';
import { radii, shadows, spacing, useColors } from '@/theme';

type Props = {
  onPress: () => void;
  style?: ViewStyle;
};

/** Floating round dustbin button used while in selection mode */
export function SelectionDeleteBtn({ onPress, style }: Props) {
  const colors = useColors();
  const handle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  };
  return (
    <Pressable
      onPress={handle}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: '#C97B6E' },
        pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 },
        style,
      ]}
      hitSlop={10}
    >
      <Trash2 size={22} color={colors.bg} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.xxl,
    bottom: 96 + spacing.lg,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.soft,
  },
});
