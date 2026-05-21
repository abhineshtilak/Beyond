import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { typeScale, TypeVariant, useColors } from '@/theme';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', color, align, style, children, ...rest }: Props) {
  const colors = useColors();
  return (
    <RNText
      style={[
        typeScale[variant],
        { color: color ?? colors.text, textAlign: align },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
