// Root of the app: fonts, saved data, the colour theme, and the choice between first-run setup and the main tabs.
import { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Jersey10_400Regular } from '@expo-google-fonts/jersey-10';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { AppDataProvider, useApp } from '../AppDataProvider';
import { ThemeProvider, palettes } from '../theme';
import { TERMS_VERSION } from '../storage';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const system = useColorScheme();
  const [loaded, error] = useFonts({
    Jersey10_400Regular, VT323_400Regular,
    AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold,
  });
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync(); }, [loaded, error]);
  if (!loaded && !error) return null;

  // Before saved data loads, follow the phone's setting so there's no flash of the wrong colours.
  const loadingBg = (system === 'light' ? palettes.light : palettes.dark).bg;
  return (
    <SafeAreaProvider>
      <AppDataProvider loading={<View style={{ flex: 1, backgroundColor: loadingBg }} />}>
        <ThemedRoot />
      </AppDataProvider>
    </SafeAreaProvider>
  );
}

/** Picks the palette (Options choice, or the phone's light/dark setting) and provides it to every screen. */
function ThemedRoot() {
  const { data } = useApp();
  const system = useColorScheme();
  const choice = data.settings.theme ?? 'system';
  const name = choice === 'system' ? (system === 'light' ? 'light' : 'dark') : choice;
  const colors = palettes[name];
  // Setup shows until it's finished or skipped, and the safety screen until the current terms have been agreed to.
  const needsSetup = data.setup === 'pending' || data.safetyAckAt == null || data.termsVersion !== TERMS_VERSION;
  return (
    <ThemeProvider value={colors}>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={needsSetup}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!needsSetup}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
