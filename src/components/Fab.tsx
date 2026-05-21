import React from 'react';
import { Pressable, ViewStyle } from 'react-native';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { radii, spacing, shadows, useColors } from '@/theme';

type Props = {
  onPress: () => void;
  style?: ViewStyle;
};

export function Fab({ onPress, style }: Props) {
  const colors = useColors();
  const handle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };
  return (
    <Pressable
      onPress={handle}
      style={({ pressed }) => [
        {
          position: 'absolute',
          right: spacing.xxl,
          bottom: 96 + spacing.lg,
          width: 56,
          height: 56,
          borderRadius: radii.pill,
          backgroundColor: colors.text,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.soft,
        },
        pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 },
        style,
      ]}
      hitSlop={10}
    >
      <Plus size={24} color={colors.bg} strokeWidth={2} />
    </Pressable>
  );
}
