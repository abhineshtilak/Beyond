import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, useColors, useTheme } from '@/theme';
import { TAB_BAR_HEIGHT } from './TabBar';

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
  const { resolved } = useTheme();
  // Match Fab.tsx: TAB_BAR_HEIGHT + inset + sm gap + lg breathing room
  const bottomInset = tabBarPadding
    ? TAB_BAR_HEIGHT + insets.bottom + spacing.sm + spacing.lg + spacing.lg
    : insets.bottom;

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
        barStyle={resolved === 'light' ? 'dark-content' : 'light-content'}
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
