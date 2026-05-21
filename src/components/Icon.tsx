import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { colors } from '@/theme';

type Props = LucideProps & {
  icon: LucideIcon;
  size?: number;
  color?: string;
};

export function Icon({ icon: LucideIconComponent, size = 22, color = colors.text, ...rest }: Props) {
  return <LucideIconComponent size={size} color={color} strokeWidth={1.75} {...rest} />;
}
