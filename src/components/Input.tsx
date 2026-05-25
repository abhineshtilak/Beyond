import React, { useMemo } from 'react';
import { TextInputProps, View, ViewStyle } from 'react-native';
import { StableTextInput } from './StableTextInput';
import { radii, spacing, fonts, useColors } from '@/theme';
import { Text } from './Text';

type Props = TextInputProps & {
  label?: string;
  containerStyle?: ViewStyle;
  multiline?: boolean;
};

export function Input({ label, containerStyle, multiline, style, ...rest }: Props) {
  const colors = useColors();

  const inputStyle = useMemo(() => ([
    {
      fontFamily: fonts.sans,
      fontSize: 16,
      color: colors.text,
      borderColor: colors.hairline,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      minHeight: multiline ? 120 : 52,
      textAlignVertical: (multiline ? 'top' : 'center') as 'top' | 'center',
    },
    style,
  ]), [colors.text, colors.hairline, colors.surface, multiline, style]);

  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      {label ? (
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
          {label}
        </Text>
      ) : null}
      <StableTextInput
        importantForAutofill="no"
        autoCorrect={false}
        selectionColor={colors.accent}
        {...rest}
        multiline={multiline}
        placeholderTextColor={colors.textFaint}
        style={inputStyle}
      />
    </View>
  );
}
