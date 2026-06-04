import React from 'react';
import { Pressable, ViewStyle } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from '@/lib/haptics';
import { radii, spacing, shadows, useColors } from '@/theme';
import { TAB_BAR_HEIGHT } from './TabBar';

type Props = {
  onPress: () => void;
  style?: ViewStyle;
};

export function Fab({ onPress, style }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Always sits above the full tab-bar zone (pill height + bottom inset + gap)
  // on every device — no device-specific magic numbers needed.
  const fabBottom = TAB_BAR_HEIGHT + insets.bottom + spacing.sm + spacing.lg;

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
          bottom: fabBottom,
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
