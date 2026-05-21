import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, useColors } from '@/theme';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  tabBarPadding?: boolean;
};

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  style,
  contentStyle,
  tabBarPadding = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const bottomInset = tabBarPadding ? 96 + insets.bottom : insets.bottom;

  const innerStyle = [
    padded && { paddingHorizontal: spacing.xxl },
    { paddingBottom: bottomInset },
    contentStyle,
  ];

  const styles = useMemo(() =>
    StyleSheet.create({
      root: { flex: 1, backgroundColor: colors.bg },
      flex: { flex: 1 },
    }),
  [colors]);

  return (
    <SafeAreaView edges={edges} style={[styles.root, style]}>
      <StatusBar
        barStyle={colors.bg.startsWith('#1') ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={innerStyle}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, innerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
