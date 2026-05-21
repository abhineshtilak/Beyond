import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronRight, Plus } from 'lucide-react-native';
import { Text } from './Text';
import { colors, radii, spacing } from '@/theme';

type Props = {
  label: string;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  tint?: string;
  serif?: boolean;
};

export function EditableSection({ label, value, placeholder, onPress, tint, serif }: Props) {
  const filled = !!(value && value.trim());
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.card,
      tint ? { backgroundColor: tint } : null,
      pressed && { opacity: 0.85 },
    ]}>
      <View style={styles.head}>
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
          {label}
        </Text>
        {filled ? (
          <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.75} />
        ) : (
          <View style={styles.addBadge}>
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
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
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
    backgroundColor: colors.surfaceAlt,
  },
});
