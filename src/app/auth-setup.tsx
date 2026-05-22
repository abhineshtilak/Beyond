import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Lock,
  Fingerprint,
  ScanFace,
  LockOpen,
  Delete,
  Check,
  ShieldCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { spacing, radii, fonts, useColors } from '@/theme';
import {
  getAuthMode,
  saveAuthMode,
  savePin,
  clearPin,
  isBiometricAvailable,
  getBiometricType,
  verifyPin,
  type AuthMode,
  type BiometricType,
} from '@/lib/auth';
import { useAuthStore } from '@/store/auth';

const PIN_LENGTH = 4;

type Step =
  | 'choose'    // pick mode
  | 'enter-pin' // enter new PIN
  | 'confirm-pin' // re-enter to confirm
  | 'verify-current'; // verify existing PIN before changing

export default function AuthSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const setStoreMode = useAuthStore((s) => s.setMode);

  const [currentMode, setCurrentMode] = useState<AuthMode>('none');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioType, setBioType] = useState<BiometricType>('none');
  const [pendingMode, setPendingMode] = useState<AuthMode>('none');

  const [step, setStep] = useState<Step>('choose');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getAuthMode().then(setCurrentMode);
    isBiometricAvailable().then(setBioAvailable);
    getBiometricType().then(setBioType);
  }, []);

  // ─── Shake ─────────────────────────────────────────────────────────────────
  const shake = (onDone?: () => void) => {
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
      onDone?.();
    });
  };

  // ─── Mode selection ────────────────────────────────────────────────────────
  const handleModeSelect = (mode: AuthMode) => {
    if (mode === 'none') {
      if (currentMode !== 'none') {
        // Require current PIN to disable
        if (currentMode === 'pin' || currentMode === 'both') {
          setPendingMode('none');
          setStep('verify-current');
          return;
        }
      }
      applyMode('none');
      return;
    }

    // If switching to a mode that needs PIN
    if (mode === 'pin' || mode === 'both') {
      setPendingMode(mode);
      if (currentMode !== 'none' && (currentMode === 'pin' || currentMode === 'both')) {
        setStep('verify-current');
      } else {
        setStep('enter-pin');
      }
      return;
    }

    // Biometric only
    if (mode === 'biometric') {
      applyMode('biometric');
    }
  };

  const applyMode = async (mode: AuthMode) => {
    await saveAuthMode(mode);
    if (mode === 'none') {
      await clearPin();
    }
    setCurrentMode(mode);
    setStoreMode(mode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  // ─── PIN digit input ───────────────────────────────────────────────────────
  const handleDigit = async (digit: string) => {
    if (error) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const next = pin + digit;
    setPin(next);

    if (next.length < PIN_LENGTH) return;

    if (step === 'verify-current') {
      const ok = await verifyPin(next);
      if (!ok) { shake(); return; }
      // Verified, now what? Go to enter-pin or apply 'none'
      if (pendingMode === 'none') {
        applyMode('none');
      } else {
        setPin('');
        setStep('enter-pin');
      }
      return;
    }

    if (step === 'enter-pin') {
      setFirstPin(next);
      setPin('');
      setStep('confirm-pin');
      return;
    }

    if (step === 'confirm-pin') {
      if (next !== firstPin) {
        shake(() => {
          setFirstPin('');
          setStep('enter-pin');
        });
        return;
      }
      await savePin(next);
      await saveAuthMode(pendingMode);
      setCurrentMode(pendingMode);
      setStoreMode(pendingMode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    }
  };

  const handleBackspace = () => {
    if (error) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPin((p) => p.slice(0, -1));
  };

  const goBack = () => {
    if (step !== 'choose') {
      setPin('');
      setFirstPin('');
      setStep('choose');
    } else {
      router.back();
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const BioIcon = bioType === 'face' ? ScanFace : Fingerprint;

  const stepTitle: Record<Step, string> = {
    'choose': 'Security',
    'verify-current': 'Confirm current PIN',
    'enter-pin': 'Create PIN',
    'confirm-pin': 'Confirm PIN',
  };

  const stepSub: Record<Step, string> = {
    'choose': 'Choose how Beyond locks when you leave.',
    'verify-current': 'Enter your existing 4-digit PIN first.',
    'enter-pin': 'Enter a 4-digit PIN.',
    'confirm-pin': 'Type your PIN once more to confirm.',
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={goBack} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Settings
            </Text>
            <Text variant="h1" style={{ marginTop: 2 }}>{stepTitle[step]}</Text>
          </View>
        </View>

        <Text variant="body" color={colors.textMuted} style={{ paddingHorizontal: spacing.xxl, marginBottom: spacing.xxl }}>
          {stepSub[step]}
        </Text>

        {step === 'choose' ? (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.sm }}
            showsVerticalScrollIndicator={false}
          >
            {/* None */}
            <ModeRow
              icon={LockOpen}
              title="None"
              description="Opens directly — no lock."
              selected={currentMode === 'none'}
              onPress={() => handleModeSelect('none')}
              colors={colors}
            />

            {/* PIN */}
            <ModeRow
              icon={Lock}
              title="PIN"
              description="4-digit code each time you open."
              selected={currentMode === 'pin'}
              onPress={() => handleModeSelect('pin')}
              colors={colors}
            />

            {/* Biometric */}
            {bioAvailable ? (
              <ModeRow
                icon={BioIcon}
                title={bioType === 'face' ? 'Face ID' : 'Fingerprint'}
                description={
                  bioType === 'face'
                    ? 'Unlock with your face.'
                    : 'Unlock with your fingerprint.'
                }
                selected={currentMode === 'biometric'}
                onPress={() => handleModeSelect('biometric')}
                colors={colors}
              />
            ) : null}

            {/* Both */}
            {bioAvailable ? (
              <ModeRow
                icon={ShieldCheck}
                title="PIN + Biometrics"
                description="Biometric first, PIN as fallback."
                selected={currentMode === 'both'}
                onPress={() => handleModeSelect('both')}
                colors={colors}
              />
            ) : null}

            {!bioAvailable ? (
              <View style={[styles.infoBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
                <Text variant="small" color={colors.textMuted}>
                  Biometric options are not available on this device or no biometrics are enrolled in system settings.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        ) : (
          /* PIN entry pad */
          <View style={styles.pinWrap}>
            <Animated.View style={[styles.dots, { transform: [{ translateX: shakeAnim }] }]}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i < pin.length
                          ? error ? colors.rose : colors.text
                          : colors.hairline,
                    },
                  ]}
                />
              ))}
            </Animated.View>

            <View style={styles.pad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <PadKey key={d} label={d} onPress={() => handleDigit(d)} colors={colors} />
              ))}
              <View style={styles.padKey} />
              <PadKey label="0" onPress={() => handleDigit('0')} colors={colors} />
              <Pressable
                onPress={handleBackspace}
                style={({ pressed }) => [styles.padKey, pressed && { opacity: 0.6 }]}
              >
                <Delete
                  size={22}
                  color={pin.length > 0 ? colors.textSoft : colors.textFaint}
                  strokeWidth={1.75}
                />
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

function ModeRow({
  icon: Icon,
  title,
  description,
  selected,
  onPress,
  colors,
}: {
  icon: any;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeRow,
        {
          backgroundColor: selected ? colors.text : colors.surface,
          borderColor: selected ? colors.text : colors.hairline,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.modeIconWrap, { backgroundColor: selected ? colors.bg + '22' : colors.surfaceAlt }]}>
        <Icon size={20} color={selected ? colors.bg : colors.textSoft} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" color={selected ? colors.bg : colors.text}>{title}</Text>
        <Text variant="small" color={selected ? colors.bg + 'AA' : colors.textMuted} style={{ marginTop: 2 }}>
          {description}
        </Text>
      </View>
      {selected ? <Check size={18} color={colors.bg} strokeWidth={2.5} /> : null}
    </Pressable>
  );
}

function PadKey({ label, onPress, colors }: { label: string; onPress: () => void; colors: any }) {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  modeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
  },

  // PIN pad
  pinWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: spacing.xxl,
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
});
