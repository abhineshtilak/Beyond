import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { radii, spacing, useColors, useTheme, resolveTint } from '@/theme';
import { Text } from './Text';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tint?: string;
  style?: ViewStyle;
  leading?: React.ReactNode;
  size?: 'sm' | 'md';
};

export function Chip({ label, selected, onPress, tint, style, leading, size = 'md' }: Props) {
  const colors = useColors();
  const { resolved } = useTheme();
  const themedTint = resolveTint(tint, resolved);
  const bg = selected ? (themedTint ?? colors.text) : colors.surface;
  const fg = selected ? (themedTint ? colors.text : colors.bg) : colors.textSoft;
  const border = selected ? 'transparent' : colors.hairline;

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          borderRadius: radii.pill,
          borderWidth: 1,
          backgroundColor: bg,
          borderColor: border,
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.lg,
          paddingVertical: size === 'sm' ? 6 : spacing.sm,
        },
        style,
      ]}
    >
      {leading}
      <Text variant={size === 'sm' ? 'smallMedium' : 'bodyMedium'} color={fg}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
      {content}
    </Pressable>
  );
}
