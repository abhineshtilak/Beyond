import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Sheet, SheetRef } from '@/components/Sheet';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';

export type ProgressSheetRef = {
  present: (current: number, onSave: (value: number) => Promise<void> | void) => void;
  dismiss: () => void;
};

const PRESETS = [0, 10, 25, 50, 75, 90, 100];

export const ProgressSheet = forwardRef<ProgressSheetRef>(function ProgressSheet(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const colors = useColors();
  const [value, setValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const onSaveRef = useRef<((v: number) => Promise<void> | void) | null>(null);
  const trackWidthRef = useRef(0);

  const present = useCallback((current: number, onSave: (v: number) => Promise<void> | void) => {
    setValue(current);
    onSaveRef.current = onSave;
    sheetRef.current?.present();
  }, []);

  useImperativeHandle(ref, () => ({
    present,
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    if (!onSaveRef.current) return;
    setSaving(true);
    try {
      await onSaveRef.current(value);
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  };

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  // Slider track touch handlers — pure RN, no extra libs needed
  const handleTrackTouch = useCallback((pageX: number, trackX: number) => {
    if (trackWidthRef.current <= 0) return;
    const pct = (pageX - trackX) / trackWidthRef.current;
    setValue(clamp(pct * 100));
  }, []);

  const trackRef = useRef<View>(null);
  const trackPageX = useRef(0);

  return (
    <Sheet
      ref={sheetRef}
      title="Set progress"
      subtitle="Drag the bar or tap a preset"
      snapPoints={['50%']}
      footer={<Button label="Save" onPress={handleSave} loading={saving} />}
    >
      {/* Big number */}
      <View style={styles.numberRow}>
        <Text variant="display" style={{ fontSize: 64, lineHeight: 72 }}>
          {value}
        </Text>
        <Text variant="h2" color={colors.textMuted} style={{ alignSelf: 'flex-end', marginBottom: 10 }}>
          %
        </Text>
      </View>

      {/* Slider track */}
      <View
        ref={trackRef}
        onLayout={(e) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
          trackRef.current?.measure((_fx, _fy, _w, _h, px) => {
            trackPageX.current = px;
          });
        }}
        style={[styles.track, { backgroundColor: colors.hairline }]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          // Measure fresh on first touch in case of scroll
          trackRef.current?.measure((_fx, _fy, _w, _h, px) => {
            trackPageX.current = px;
            handleTrackTouch(e.nativeEvent.pageX, px);
          });
        }}
        onResponderMove={(e) => {
          handleTrackTouch(e.nativeEvent.pageX, trackPageX.current);
        }}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${value}%`,
              backgroundColor: colors.accent ?? '#7FA682',
            },
          ]}
        />
        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            {
              left: `${value}%` as unknown as number,
              backgroundColor: colors.accent ?? '#7FA682',
              borderColor: colors.bg,
            },
          ]}
        />
      </View>

      {/* ±1 row */}
      <View style={styles.fineRow}>
        <Pressable
          onPress={() => setValue((v) => clamp(v - 1))}
          style={({ pressed }) => [styles.fineBtn, { backgroundColor: colors.surface, borderColor: colors.hairline }, pressed && { opacity: 0.6 }]}
        >
          <Text variant="h2">−</Text>
        </Pressable>
        <Pressable
          onPress={() => setValue((v) => clamp(v + 1))}
          style={({ pressed }) => [styles.fineBtn, { backgroundColor: colors.surface, borderColor: colors.hairline }, pressed && { opacity: 0.6 }]}
        >
          <Text variant="h2">+</Text>
        </Pressable>
      </View>

      {/* Presets */}
      <View style={styles.presets}>
        {PRESETS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setValue(p)}
            style={({ pressed }) => [
              styles.preset,
              {
                backgroundColor: value === p ? (colors.accent ?? '#7FA682') : colors.surface,
                borderColor: value === p ? 'transparent' : colors.hairline,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              variant="smallMedium"
              color={value === p ? '#fff' : colors.textSoft}
            >
              {p}%
            </Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: spacing.xl,
  },
  track: {
    height: 28,
    borderRadius: radii.pill,
    overflow: 'visible',
    position: 'relative',
    marginBottom: spacing.xl,
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: radii.pill,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    marginTop: -14,
    marginLeft: -14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  fineRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  fineBtn: {
    flex: 1,
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  preset: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
