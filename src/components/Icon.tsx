import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { useColors } from '@/theme';

type Props = LucideProps & {
  icon: LucideIcon;
  size?: number;
  color?: string;
};

export function Icon({ icon: LucideIconComponent, size = 22, color, ...rest }: Props) {
  const colors = useColors();
  return (
    <LucideIconComponent
      size={size}
      color={color ?? colors.text}
      strokeWidth={1.75}
      {...rest}
    />
  );
}
