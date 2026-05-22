import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fingerprint, ScanFace, Delete } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import { spacing, radii, fonts, useColors } from '@/theme';
import {
  authenticateWithBiometric,
  getBiometricType,
  isBiometricAvailable,
  verifyPin,
  type AuthMode,
  type BiometricType,
} from '@/lib/auth';

const PIN_LENGTH = 4;

type Props = {
  mode: AuthMode;
  onUnlock: () => void;
};

export function LockScreen({ mode, onUnlock }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioType, setBioType] = useState<BiometricType>('none');

  // Shake animation for wrong PIN
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const showPin = mode === 'pin' || mode === 'both';
  const showBio = mode === 'biometric' || mode === 'both';

  // ─── Setup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (showBio) {
      isBiometricAvailable().then(setBioAvailable);
      getBiometricType().then(setBioType);
    }
  }, [showBio]);

  // Auto-trigger biometric on mount
  useEffect(() => {
    if (showBio && bioAvailable) {
      triggerBiometric();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bioAvailable]);

  // ─── Biometric ─────────────────────────────────────────────────────────────
  const triggerBiometric = useCallback(async () => {
    const ok = await authenticateWithBiometric();
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onUnlock();
    }
  }, [onUnlock]);

  // ─── PIN shake ─────────────────────────────────────────────────────────────
  const shake = useCallback(() => {
    setError(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => {
      setError(false);
      setPin('');
    });
  }, [shakeAnim]);

  // ─── PIN digit entry ───────────────────────────────────────────────────────
  const handleDigit = useCallback(async (digit: string) => {
    if (error) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const next = pin + digit;
    setPin(next);

    if (next.length === PIN_LENGTH) {
      const ok = await verifyPin(next);
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onUnlock();
      } else {
        shake();
      }
    }
  }, [pin, error, onUnlock, shake]);

  const handleBackspace = useCallback(() => {
    if (error) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPin((p) => p.slice(0, -1));
  }, [error]);

  // ─── Render ────────────────────────────────────────────────────────────────
  const BioIcon = bioType === 'face' ? ScanFace : Fingerprint;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle={colors.bg === '#1B1814' ? 'light-content' : 'dark-content'} />

      {/* App name */}
      <View style={styles.top}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 36, color: colors.text }}>
          Beyond
        </Text>
        <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
          {showPin ? 'Enter your PIN to continue' : 'Use biometrics to unlock'}
        </Text>
      </View>

      {/* PIN dots */}
      {showPin ? (
        <Animated.View style={[styles.dots, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < pin.length
                      ? (error ? colors.rose : colors.text)
                      : colors.hairline,
                },
              ]}
            />
          ))}
        </Animated.View>
      ) : null}

      {/* Numpad */}
      {showPin ? (
        <View style={styles.pad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <PadKey key={d} label={d} onPress={() => handleDigit(d)} colors={colors} />
          ))}

          {/* Bottom row: biometric / 0 / backspace */}
          {showBio && bioAvailable ? (
            <Pressable
              onPress={triggerBiometric}
              style={({ pressed }) => [styles.padKey, styles.padKeyAction, pressed && { opacity: 0.6 }]}
            >
              <BioIcon size={26} color={colors.textSoft} strokeWidth={1.6} />
            </Pressable>
          ) : (
            <View style={styles.padKey} />
          )}

          <PadKey label="0" onPress={() => handleDigit('0')} colors={colors} />

          <Pressable
            onPress={handleBackspace}
            style={({ pressed }) => [styles.padKey, styles.padKeyAction, pressed && { opacity: 0.6 }]}
          >
            <Delete size={22} color={pin.length > 0 ? colors.textSoft : colors.textFaint} strokeWidth={1.75} />
          </Pressable>
        </View>
      ) : (
        /* Biometric-only mode */
        <View style={styles.bioOnly}>
          {bioAvailable ? (
            <Pressable
              onPress={triggerBiometric}
              style={({ pressed }) => [
                styles.bioBtn,
                { backgroundColor: colors.surface, borderColor: colors.hairline },
                pressed && { opacity: 0.7 },
              ]}
            >
              <BioIcon size={36} color={colors.text} strokeWidth={1.5} />
              <Text variant="bodyMedium" color={colors.textSoft} style={{ marginTop: spacing.sm }}>
                {bioType === 'face' ? 'Use Face ID' : 'Use Fingerprint'}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.bioBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
              <BioIcon size={36} color={colors.textMuted} strokeWidth={1.5} />
              <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                Biometric unavailable.{'\n'}Restart the app and try again.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function PadKey({
  label,
  onPress,
  colors,
}: {
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.padKey,
        { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' },
      ]}
    >
      <Text style={{ fontFamily: fonts.sans, fontSize: 28, color: colors.text }}>{label}</Text>
    </Pressable>
  );
}

const KEY_SIZE = 80;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.huge,
  },
  top: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: KEY_SIZE * 3 + spacing.lg * 2,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  padKey: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padKeyAction: {
    // no text, just icon — same size
  },

  // Biometric-only
  bioOnly: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  bioBtn: {
    alignItems: 'center',
    padding: spacing.xxxl,
    borderRadius: radii.xxl,
    borderWidth: 1,
    gap: spacing.sm,
  },
});
