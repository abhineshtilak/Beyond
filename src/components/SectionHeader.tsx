import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ title, subtitle, action }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text variant="h3">{title}</Text>
        {subtitle ? <Text variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
});
