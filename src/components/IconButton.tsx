import React from 'react';
import { Pressable, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { radii, useColors } from '@/theme';
import { Icon } from './Icon';

type Props = {
  icon: LucideIcon;
  onPress: () => void;
  size?: number;
  color?: string;
  bg?: string;
  style?: ViewStyle;
};

export function IconButton({ icon, onPress, size = 22, color, bg, style }: Props) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg ?? colors.surface,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
      hitSlop={10}
    >
      <Icon icon={icon} size={size} color={color ?? colors.text} />
    </Pressable>
  );
}
