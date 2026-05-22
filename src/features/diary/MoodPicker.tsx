import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import { MOOD_META } from './types';
import type { Mood } from './types';

type Props = {
  value: Mood | null;
  onChange: (m: Mood | null) => void;
};

const ORDER: Mood[] = ['great', 'good', 'ok', 'low', 'bad'];

export function MoodPicker({ value, onChange }: Props) {
  const colors = useColors();

  return (
    <View style={styles.row}>
      {ORDER.map((m) => {
        const meta = MOOD_META[m];
        const selected = value === m;
        return (
          <Pressable
            key={m}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(selected ? null : m);
            }}
            style={styles.item}
            hitSlop={6}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: meta.tint, opacity: selected ? 1 : 0.45 },
                selected && { borderWidth: 2, borderColor: colors.text },
              ]}
            />
            <Text
              variant="caption"
              color={selected ? colors.text : colors.textMuted}
              style={{ marginTop: 6 }}
            >
              {meta.label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  item: { alignItems: 'center', flex: 1 },
  dot: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
  },
});
