import { Tabs } from 'expo-router';
import { PixelSprite } from '../../components/PixelSprite';
import { HEART, calendarSprite, flaskSprite, gearSprite } from '../../sprites';
import { useColors, makeStyles, type Palette, fonts } from '../../theme';

const tint = (colors: Palette, focused: boolean) => (focused ? colors.gold : colors.inkFaint);

export default function TabsLayout() {
  const colors = useColors();
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
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ focused }) => <PixelSprite sprite={calendarSprite(tint(colors, focused))} scale={2} /> }} />
      <Tabs.Screen name="science" options={{ title: 'Science', tabBarIcon: ({ focused }) => <PixelSprite sprite={flaskSprite(tint(colors, focused))} scale={2} /> }} />
      <Tabs.Screen name="options" options={{ title: 'Options', tabBarIcon: ({ focused }) => <PixelSprite sprite={gearSprite(tint(colors, focused))} scale={2} /> }} />
    </Tabs>
  );
}
