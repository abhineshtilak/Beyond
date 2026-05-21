import React from 'react';
import { View, Pressable, ViewStyle } from 'react-native';
import { radii, spacing, shadows, useColors, useTheme, resolveTint } from '@/theme';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: keyof typeof spacing;
  tint?: string;
  flat?: boolean;
};

export function Card({ children, onPress, style, padding = 'xl', tint, flat = false }: Props) {
  const colors = useColors();
  const isDark = useTheme().resolved === 'dark';
  const themedTint = resolveTint(tint, isDark);
  const containerStyle: ViewStyle = {
    backgroundColor: themedTint ?? colors.surface,
    borderRadius: radii.xl,
    padding: spacing[padding],
    ...(flat ? {} : shadows.card),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          pressed && { opacity: 0.75, transform: [{ scale: 0.99 }] },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}
