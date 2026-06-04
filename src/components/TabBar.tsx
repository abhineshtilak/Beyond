import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from '@/lib/haptics';
import { Home, Target, BookOpen, Zap, LayoutGrid } from 'lucide-react-native';
import { radii, spacing, shadows, useColors } from '@/theme';
import { Text } from './Text';

// Exported so Fab and Screen can derive correct offsets on any device.
export const TAB_BAR_HEIGHT = 66;

const TAB_META: Record<string, { label: string; icon: any }> = {
  index:          { label: 'Home',    icon: Home },
  'journal-feed': { label: 'Journal', icon: BookOpen },
  actions:        { label: 'Actions', icon: Zap },
  goals:          { label: 'Goals',   icon: Target },
  more:           { label: 'More',    icon: LayoutGrid },
};

function withAlpha(hex: string, alpha: string) {
  return hex.length === 7 ? `${hex}${alpha}` : hex;
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
  // Live insets from hook — never goes stale across orientation / nav-bar changes.
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + spacing.sm;

  const activeBg  = withAlpha(colors.accentSoft, 'E6');
  const pressedBg = withAlpha(colors.surfaceAlt, 'B8');

  return (
    // Opaque wrap prevents content scrolling through the bar area on ANY tab.
    // Using bottom:0 (natural anchor) instead of a computed top offset avoids
    // the "shaking" that occurs when screen dimensions change between tabs.
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: bottomPad,
          // Match the screen background so the area below the pill is invisible.
          backgroundColor: colors.bg,
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
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
          const iconColor  = focused ? colors.text     : colors.textSoft;
          const labelColor = focused ? colors.textSoft  : colors.textMuted;

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
                focused && { backgroundColor: activeBg, borderColor: withAlpha(colors.accent, '55') },
                pressed && { backgroundColor: focused ? activeBg : pressedBg, transform: [{ translateY: 1 }] },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
            >
              {/* Icon container — glows on active via shadow + surface bg */}
              <View
                style={[
                  styles.iconWrap,
                  focused
                    ? {
                        backgroundColor: colors.surface,
                        borderColor: colors.hairline,
                        // Subtle glow that reads on both themes
                        shadowColor: colors.text,
                        shadowOpacity: 0.18,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 4,
                      }
                    : {
                        backgroundColor: 'transparent',
                        borderColor: 'transparent',
                      },
                ]}
              >
                <IconCmp
                  size={focused ? 21 : 20}
                  color={iconColor}
                  strokeWidth={focused ? 2.25 : 1.75}
                />
              </View>

              {/* Label — normal case always, no uppercase */}
              <Text
                variant="caption"
                color={labelColor}
                numberOfLines={1}
                style={styles.label}
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
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
  },
  bar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
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
    // No textTransform — label stays sentence-case on active and inactive both
  },
});
