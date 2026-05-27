import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import * as Haptics from '@/lib/haptics';
import { radii, useColors } from '@/theme';

type Props = {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  tint?: string;
};

export function Checkbox({ checked, onToggle, size = 26, tint }: Props) {
  const colors = useColors();
  const tintColor = tint ?? colors.text;
  const scale = useSharedValue(checked ? 1 : 0);

  React.useEffect(() => {
    scale.value = withSpring(checked ? 1 : 0, { damping: 14, stiffness: 220 });
  }, [checked]);

  const innerStyle = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ scale: scale.value }],
  }));

  const handle = () => {
    Haptics.impactAsync(checked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onToggle();
  };

  return (
    <Pressable onPress={handle} hitSlop={10}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radii.pill,
          borderColor: checked ? tintColor : colors.hairline,
          borderWidth: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: checked ? tintColor : 'transparent',
        }}
      >
        <Animated.View style={innerStyle}>
          <Check size={size * 0.55} color={colors.bg} strokeWidth={3} />
        </Animated.View>
      </View>
    </Pressable>
  );
}
