import React from 'react';
import { Pressable, ViewStyle, ActivityIndicator } from 'react-native';
import { radii, spacing, useColors } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
  fullWidth = true,
}: Props) {
  const colors = useColors();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  const bg = isPrimary ? colors.text : isGhost ? 'transparent' : colors.surface;
  const fg = isPrimary ? colors.bg : colors.text;
  const border = isGhost ? 'transparent' : isPrimary ? colors.text : colors.hairline;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xxl,
          borderRadius: radii.pill,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'secondary' ? 1 : 0,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text variant="bodyMedium" color={fg}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
