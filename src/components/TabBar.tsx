import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Target, Sparkles, CheckCircle2, LayoutGrid } from 'lucide-react-native';
import { radii, spacing, shadows, useColors } from '@/theme';
import { Text } from './Text';

const TAB_META: Record<string, { label: string; icon: any }> = {
  index: { label: 'Home', icon: Home },
  goals: { label: 'Goals', icon: Target },
  habits: { label: 'Habits', icon: Sparkles },
  tasks: { label: 'Tasks', icon: CheckCircle2 },
  more: { label: 'More', icon: LayoutGrid },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View
        style={[
          styles.bar,
          { backgroundColor: colors.surface, borderColor: colors.hairline },
        ]}
      >
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const IconCmp = meta.icon;
          const tint = focused ? colors.text : colors.textMuted;
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.item}
              hitSlop={8}
            >
              <View style={[styles.iconWrap, focused && { backgroundColor: colors.accentSoft }]}>
                <IconCmp size={20} color={tint} strokeWidth={focused ? 2 : 1.6} />
              </View>
              <Text variant="caption" color={tint} style={{ marginTop: 4 }}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    borderRadius: radii.xxl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    ...shadows.soft,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  iconWrap: {
    width: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
});
