import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { PixelifySans_600SemiBold, PixelifySans_700Bold } from '@expo-google-fonts/pixelify-sans';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { TonightScreen } from './src/screens/TonightScreen';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    PixelifySans_600SemiBold, PixelifySans_700Bold, VT323_400Regular,
    AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {fontsLoaded ? (
        <TonightScreen />
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.gold} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
