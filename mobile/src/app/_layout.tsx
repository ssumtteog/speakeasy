import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppTabs from '@/components/app-tabs';
import { SpeakeasyBridgeProvider, useSpeakeasyBridge } from '@/context/speakeasy-bridge';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootShell() {
  const { theme } = useSpeakeasyBridge();
  const isDark = theme === 'dark';

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppTabs />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SpeakeasyBridgeProvider>
        <RootShell />
      </SpeakeasyBridgeProvider>
    </SafeAreaProvider>
  );
}
