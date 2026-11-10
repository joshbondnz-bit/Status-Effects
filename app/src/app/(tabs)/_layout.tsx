import { Tabs } from 'expo-router';
import { PixelSprite } from '../../components/PixelSprite';
import { HEART, gearSprite } from '../../sprites';
import { colors, fonts } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.edgeHi, borderTopWidth: 3 },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 12 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Tonight', tabBarIcon: ({ focused }) => <PixelSprite sprite={HEART} scale={3} dim={!focused} /> }} />
      <Tabs.Screen name="options" options={{ title: 'Options', tabBarIcon: ({ focused }) => <PixelSprite sprite={gearSprite(focused ? colors.gold : colors.inkFaint)} scale={2} /> }} />
    </Tabs>
  );
}
