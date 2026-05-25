import React, { useRef } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
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

// Bar pill height is fixed so React Navigation never has to remeasure it.
const BAR_HEIGHT = 66;

function withAlpha(hex: string, alpha: string) {
  return hex.length === 7 ? `${hex}${alpha}` : hex;
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  // Freeze the bottom inset on the first valid measurement so the total
  // tab-bar height never changes after mount. Without this, Android
  // edge-to-edge reports different inset values when the keyboard appears,
  // which causes React Navigation to remeasure the bar and shift all content.
  const frozenBottom = useRef<number | null>(null);
  if (frozenBottom.current === null) {
    // insets.bottom is 0 before SafeAreaProvider initialises — with
    // initialWindowMetrics in the root layout this resolves synchronously,
    // so we always get the real value on the first render.
    frozenBottom.current = insets.bottom;
  }
  const bottomPad = frozenBottom.current + spacing.sm;
  const shellBg = withAlpha(colors.surface, 'F2');
  const activeBg = withAlpha(colors.accentSoft, 'E6');
  const pressedBg = withAlpha(colors.surfaceAlt, 'B8');

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: shellBg,
            borderColor: colors.hairline,
          },
        ]}
      >
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const IconCmp = meta.icon;
          const options = descriptors[route.key]?.options;
          const tint = focused ? colors.text : colors.textSoft;
          const mutedTint = focused ? colors.textSoft : colors.textMuted;
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  Haptics.selectionAsync().catch(() => {});
                  navigation.navigate(route.name);
                }
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? meta.label}
              testID={options?.tabBarButtonTestID}
              style={({ pressed }) => [
                styles.item,
                focused && { backgroundColor: activeBg, borderColor: withAlpha(colors.accent, '66') },
                pressed && { backgroundColor: focused ? activeBg : pressedBg, transform: [{ translateY: 1 }] },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: focused ? colors.surface : 'transparent',
                    borderColor: focused ? colors.hairline : 'transparent',
                  },
                ]}
              >
                <IconCmp size={20} color={tint} strokeWidth={focused ? 2.25 : 1.75} />
              </View>
              <Text
                variant="caption"
                color={mutedTint}
                numberOfLines={1}
                style={focused ? styles.activeLabel : styles.label}
              >
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
    height: BAR_HEIGHT,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
    ...shadows.soft,
  },
  item: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  label: {
    maxWidth: 58,
    textAlign: 'center',
  },
  activeLabel: {
    maxWidth: 58,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
