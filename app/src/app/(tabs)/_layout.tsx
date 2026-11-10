import { Tabs } from 'expo-router';
import { PixelSprite } from '../../components/PixelSprite';
import { HEART, calendarSprite, gearSprite } from '../../sprites';
import { colors, fonts } from '../../theme';

const tint = (focused: boolean) => (focused ? colors.gold : colors.inkFaint);

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
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ focused }) => <PixelSprite sprite={calendarSprite(tint(focused))} scale={2} /> }} />
      <Tabs.Screen name="options" options={{ title: 'Options', tabBarIcon: ({ focused }) => <PixelSprite sprite={gearSprite(tint(focused))} scale={2} /> }} />
    </Tabs>
  );
}
