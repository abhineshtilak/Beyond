import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, AppState, type AppStateStatus } from 'react-native';
import { Stack, SplashScreen } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  useFonts as useFraunces,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import { initDB } from '@/lib/db';
import { configureHandler } from '@/lib/notifications';
import { useAppStore } from '@/store';
import { colors, ThemeProvider, useColors } from '@/theme';
import { useAuthStore } from '@/store/auth';
import { LockScreen } from '@/components/LockScreen';

configureHandler();

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [interLoaded] = useInter({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const [frauncesLoaded] = useFraunces({ Fraunces_500Medium, Fraunces_600SemiBold });
  const dbReady = useAppStore((s) => s.dbReady);
  const setDbReady = useAppStore((s) => s.setDbReady);
  const initAuth = useAuthStore((s) => s.initAuth);
  const authReady = useAuthStore((s) => s.authReady);

  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch((e) => {
        console.warn('DB init failed', e);
        setDbReady(true);
      });
  }, [setDbReady]);

  // Init auth after DB is ready (SecureStore is independent, but keeps ordering clean)
  useEffect(() => {
    if (dbReady) initAuth();
  }, [dbReady, initAuth]);

  const ready = interLoaded && frauncesLoaded && dbReady && authReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <RootShell />
    </ThemeProvider>
  );
}

// How long the app must be in background before re-locking (ms)
const LOCK_AFTER_BG_MS = 30_000;

function RootShell() {
  const themed = useColors();
  const locked = useAuthStore((s) => s.locked);
  const lock = useAuthStore((s) => s.lock);
  const unlock = useAuthStore((s) => s.unlock);
  const mode = useAuthStore((s) => s.mode);

  // Re-lock when app returns from background after LOCK_AFTER_BG_MS
  const bgSince = useRef<number | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        bgSince.current = Date.now();
      } else if (state === 'active') {
        const since = bgSince.current;
        if (since !== null && Date.now() - since >= LOCK_AFTER_BG_MS) {
          lock();
        }
        bgSince.current = null;
      }
    });
    return () => sub.remove();
  }, [lock]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: themed.bg }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: themed.bg },
              animation: 'slide_from_right',
              animationDuration: 220,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="reflections" />
            <Stack.Screen name="diary" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="goal/[id]" />
            <Stack.Screen name="habit/[id]" />
            <Stack.Screen name="realizations" />
            <Stack.Screen name="realization" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="dreams" />
            <Stack.Screen name="dream" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="future" />
            <Stack.Screen name="people" />
            <Stack.Screen name="person" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="learning" />
            <Stack.Screen name="learn" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="hours" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="profile" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="journal" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="future-plan" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="about" />
            <Stack.Screen name="philosophy" />
            <Stack.Screen name="auth-setup" />
            <Stack.Screen name="insights" />
          </Stack>

          {/* Lock screen overlay — rendered above everything when locked */}
          {locked ? <LockScreen mode={mode} onUnlock={unlock} /> : null}
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
