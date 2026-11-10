// Developer-only: speed up, pause or skip time, and load test nights, to watch the health bar, debuffs and animations change.
// Only shown in development (Expo Go); __DEV__ is false in App Store builds, so this never ships.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { simulateNight } from '../../../engine/src/index.ts';
import { useApp } from '../AppDataProvider';
import { newNight } from '../storage';
import { sampleNightEvents } from '../sampleNight';
import { colors, fonts } from '../theme';

const MIN = 60_000;

function Btn({ label, onPress, on }: { label: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, on && styles.on]} accessibilityRole="button" accessibilityState={on != null ? { selected: on } : undefined}>
      <Text style={[styles.txt, on && styles.txtOn]}>{label}</Text>
    </Pressable>
  );
}

export function TimeMachine() {
  const { timeMachine: tm, now, data, update, currentTime, tick } = useApp();
  if (!__DEV__) return null;
  const ahead = Math.round(tm.offset / MIN);
  const aheadText = ahead === 0 ? 'real time' : ahead < 60 ? `${ahead} min ahead` : `${(ahead / 60).toFixed(1)} h ahead`;
  const time = new Date(now);
  const day = time.toLocaleDateString([], { weekday: 'short' });

  // Tonight's wake-up time (the morning after), or the next one if that's already passed.
  const skipToMorning = () => {
    const t = currentTime();
    let wake = simulateNight({ profile: data.profile, events: data.tonight.events, now: t }).wake;
    while (wake <= t) wake += 24 * 60 * MIN;
    tm.skipTo(wake);
  };
  const loadSample = () => {
    update(d => ({ ...d, tonight: { ...newNight(), events: sampleNightEvents(currentTime()) } }));
    tick();
  };
  const emptyNight = () => { update(d => ({ ...d, tonight: newNight() })); tick(); };
  const replaySetup = () => update(d => ({ ...d, setup: 'pending' }));

  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Text style={styles.title}>TIME MACHINE · DEV ONLY</Text>
        <Text style={styles.state}>{day} {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {tm.speed === 0 ? 'paused · ' : ''}{aheadText}</Text>
      </View>
      <View style={styles.row}>
        <Btn label="Pause" on={tm.speed === 0} onPress={() => tm.setSpeed(0)} />
        {[{ s: 1, l: '1×' }, { s: 60, l: '60×' }, { s: 600, l: '600×' }].map(o => (
          <Btn key={o.s} label={o.l} on={tm.speed === o.s} onPress={() => tm.setSpeed(o.s)} />
        ))}
      </View>
      <View style={styles.row}>
        <Btn label="+15 min" onPress={() => tm.skip(15 * MIN)} />
        <Btn label="+1 hour" onPress={() => tm.skip(60 * MIN)} />
        <Btn label="Skip to morning" onPress={skipToMorning} />
        <Btn label="Back to now" onPress={tm.reset} />
      </View>
      <View style={styles.row}>
        <Btn label="Load sample night" onPress={loadSample} />
        <Btn label="Start an empty night" onPress={emptyNight} />
        <Btn label="Replay first-run setup" onPress={replaySetup} />
      </View>
      <Text style={styles.note}>60× = a minute per second. Skipping 4+ hours past wake-up files tonight into History, just like real life. Loading a sample or empty night replaces tonight's log.</Text>
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
