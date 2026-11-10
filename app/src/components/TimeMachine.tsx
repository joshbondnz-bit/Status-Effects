// Developer-only: speed up or skip time to watch the health bar, debuffs and animations change.
// Only shown in development (Expo Go); __DEV__ is false in App Store builds, so this never ships.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../AppDataProvider';
import { colors, fonts } from '../theme';

const MIN = 60_000;

export function TimeMachine() {
  const { timeMachine: tm, now } = useApp();
  if (!__DEV__) return null;
  const ahead = Math.round(tm.offset / MIN);
  const aheadText = ahead === 0 ? 'real time' : ahead < 60 ? `${ahead} min ahead` : `${(ahead / 60).toFixed(1)} h ahead`;
  const time = new Date(now);
  const day = time.toLocaleDateString([], { weekday: 'short' });

  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Text style={styles.title}>TIME MACHINE · DEV ONLY</Text>
        <Text style={styles.state}>{day} {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {aheadText}</Text>
      </View>
      <View style={styles.row}>
        {[{ s: 1, l: '1×' }, { s: 60, l: '60×' }, { s: 600, l: '600×' }].map(o => (
          <Pressable key={o.s} onPress={() => tm.setSpeed(o.s)} style={[styles.btn, tm.speed === o.s && styles.on]} accessibilityRole="button"
            accessibilityState={{ selected: tm.speed === o.s }}>
            <Text style={[styles.txt, tm.speed === o.s && styles.txtOn]}>{o.l}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => tm.skip(15 * MIN)} style={styles.btn} accessibilityRole="button"><Text style={styles.txt}>+15m</Text></Pressable>
        <Pressable onPress={() => tm.skip(60 * MIN)} style={styles.btn} accessibilityRole="button"><Text style={styles.txt}>+1h</Text></Pressable>
        <Pressable onPress={tm.reset} style={styles.btn} accessibilityRole="button"><Text style={styles.txt}>Now</Text></Pressable>
      </View>
      <Text style={styles.note}>60× = a minute per second. Skipping past tomorrow's wake time files tonight into History, just like real life.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 2, borderColor: '#6a5424', borderStyle: 'dashed', padding: 10, gap: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 },
  title: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, color: colors.gold },
  state: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkDim },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi },
  on: { backgroundColor: colors.gold, borderColor: '#ffe39a' },
  txt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkDim },
  txtOn: { color: colors.edge },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, lineHeight: 17 },
});
