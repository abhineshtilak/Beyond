import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
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

configureHandler();

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [interLoaded] = useInter({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const [frauncesLoaded] = useFraunces({ Fraunces_500Medium, Fraunces_600SemiBold });
  const dbReady = useAppStore((s) => s.dbReady);
  const setDbReady = useAppStore((s) => s.setDbReady);

  useEffect(() => {
    initDB().then(() => setDbReady(true)).catch((e) => {
      console.warn('DB init failed', e);
      setDbReady(true);
    });
  }, [setDbReady]);

  const ready = interLoaded && frauncesLoaded && dbReady;

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

function RootShell() {
  const themed = useColors();
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
          </Stack>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
