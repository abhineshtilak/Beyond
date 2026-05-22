import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useColors, spacing, radii } from '@/theme';
import { Text } from './Text';
import { Icon } from './Icon';

type Props = {
  icon: LucideIcon;
  title: string;
  message: string;
  tint?: string;
};

export function EmptyState({ icon, title, message, tint }: Props) {
  const colors = useColors();
  const iconBg = tint ?? colors.accentSoft;
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Icon icon={icon} size={28} color={colors.text} />
      </View>
      <Text variant="h2" align="center">{title}</Text>
      <Text variant="body" color={colors.textMuted} align="center" style={{ maxWidth: 280 }}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
