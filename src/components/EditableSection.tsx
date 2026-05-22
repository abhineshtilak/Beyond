import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronRight, Plus } from 'lucide-react-native';
import { Text } from './Text';
import { radii, spacing, useColors } from '@/theme';

type Props = {
  label: string;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  tint?: string;
  serif?: boolean;
};

export function EditableSection({ label, value, placeholder, onPress, tint, serif }: Props) {
  const colors = useColors();
  const filled = !!(value && value.trim());
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: tint ?? colors.surface,
          borderColor: colors.hairline,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.head}>
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
          {label}
        </Text>
        {filled ? (
          <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.75} />
        ) : (
          <View style={[styles.addBadge, { backgroundColor: colors.surfaceAlt }]}>
            <Plus size={12} color={colors.textSoft} strokeWidth={2} />
            <Text variant="caption" color={colors.textSoft}>ADD</Text>
          </View>
        )}
      </View>
      <Text
        variant={serif ? 'h3' : 'body'}
        color={filled ? colors.text : colors.textMuted}
        style={{ marginTop: spacing.sm, lineHeight: serif ? 26 : 22 }}
      >
        {filled ? value : placeholder}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
});
