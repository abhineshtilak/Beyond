import React, { useState } from 'react';
import { View, ViewStyle, TextInputProps } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { radii, spacing, fonts, useColors } from '@/theme';
import { Text } from './Text';

type Props = TextInputProps & {
  label?: string;
  containerStyle?: ViewStyle;
  multiline?: boolean;
};

export function SheetInput({ label, containerStyle, multiline, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const colors = useColors();
  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      {label ? (
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
          {label}
        </Text>
      ) : null}
      <BottomSheetTextInput
        {...rest}
        multiline={multiline}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        placeholderTextColor={colors.textFaint}
        style={[
          {
            fontFamily: fonts.sans,
            fontSize: 16,
            color: colors.text,
            borderColor: focused ? colors.text : colors.hairline,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderRadius: radii.lg,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.md,
            minHeight: multiline ? 120 : 52,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style as any,
        ]}
      />
    </View>
  );
}
