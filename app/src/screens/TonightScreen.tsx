import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import {
  MIN, PHASES, WARNING_BAC, effects, healthState, makeDrink, phaseIndex, simulateNight, standardDrinks,
  type DrinkSpec, type LogEvent,
} from '../../../engine/src/index.ts';
import { newId, sampleNightEvents } from '../sampleNight';
import { colors, fonts, panel } from '../theme';
import { glassSprite } from '../sprites';
import { HealthBar } from '../components/HealthBar';
import { StatusTray } from '../components/StatusTray';
import { LogDrinkSheet } from '../components/LogDrinkSheet';
import { NightLog } from '../components/NightLog';
import { Rations } from '../components/Rations';
import { CurveChart } from '../components/CurveChart';
import { PixelSprite } from '../components/PixelSprite';
import { SafetyCheck } from '../components/SafetyCheck';
import { TimeMachine } from '../components/TimeMachine';
import { MorningReport, findMorningNight } from '../components/MorningReport';
import type { SavedNight } from '../storage';
import { ICONS } from '../sprites';
import { clock, money } from '../format';
import { PHASE_COPY } from '../copy';
import { useApp } from '../AppDataProvider';


function Button({ label, onPress, primary, flex = 1 }: { label: string; onPress: () => void; primary?: boolean; flex?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [styles.btn, primary && styles.btnPrimary, { flex }, pressed && { transform: [{ translateY: 2 }] }]}>
      <Text style={[styles.btnTxt, primary && { color: '#fff8ee' }]}>{label}</Text>
    </Pressable>
  );
}

export function TonightScreen() {
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const [removed, setRemoved] = useState<LogEvent | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data, error, update, now, tick, currentTime } = useApp();

  const { profile, settings } = data;
  const events = data.tonight.events;
  const endedAt = data.tonight.endedAt;
  const night = useMemo(() => simulateNight({ profile, events, now }), [profile, events, now]);
  const fx = useMemo(() => effects(night, { calories: settings.calories, endedAt }), [night, settings.calories, endedAt]);
  const region = profile.region;
  // People are badly impaired well before 0 HP, so the safety check-in appears from the Wasted zone (0.15%+)
  // as well as at 0 HP, and comes back every 30 minutes while the level stays that high.
  const critical = healthState(night) === 'critical';
  // The current zone and what it means, shown under Status (it describes the state you're in).
  const zoneK = night.bacNow >= 0.25 ? 6 : phaseIndex(night.bacNow);
  const zone = {
    name: critical ? 'Critical' : PHASES[zoneK].name,
    text: PHASE_COPY[zoneK],
    color: critical || zoneK >= 5 ? colors.bad : zoneK >= 3 ? colors.warn : colors.ink,
  };
  const highRange = critical || night.bacNow >= WARNING_BAC;
  const ack = data.tonight.safetyAckAt;
  const showSafety = highRange && (ack == null || now - ack > 30 * MIN);
  const reopenSafety = () => update(d => ({ ...d, tonight: { ...d.tonight, safetyAckAt: undefined } }));

  const log = (e: LogEvent) => {
    update(d => ({ ...d, tonight: { ...d.tonight, events: [...d.tonight.events, e] } }));
    tick();
  };
  const pickDrink = (spec: DrinkSpec) => { log(makeDrink(spec, currentTime(), newId())); setSheet(false); };
  const setEnded = (t: number | null) => update(d => ({ ...d, tonight: { ...d.tonight, endedAt: t } }));

  const remove = (e: LogEvent) => {
    update(d => ({ ...d, tonight: { ...d.tonight, events: d.tonight.events.filter(x => x.id !== e.id) } }));
    setRemoved(e);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemoved(null), 6000);
  };
  const undo = () => { if (removed) { log(removed); setRemoved(null); } };

  // A sample night to try things out. Only offered while tonight's log is empty, so it never replaces real entries.
  const loadSample = () => {
    update(d => ({ ...d, tonight: { ...d.tonight, endedAt: null, events: sampleNightEvents(currentTime()) } }));
    tick();
  };

  // Morning after: report on tonight's log (once wake-up has passed) or the night just filed into History.
  const morning = findMorningNight(data, now);
  const setMorning = (patch: Partial<SavedNight>) => {
    if (!morning) return;
    const id = morning.night.id;
    update(d => morning.where === 'tonight'
      ? { ...d, tonight: { ...d.tonight, ...patch } }
      : { ...d, past: d.past.map(n => (n.id === id ? { ...n, ...patch } : n)) });
  };

  const total = standardDrinks(night.totalGrams, region);
  const spent = Math.round(night.drinks.reduce((s, d) => s + (d.cost ?? 0), 0) * 100) / 100;

  return (
    <Screen>
      <View style={styles.topRow}>
        <Text style={styles.clock}>{clock(now)}</Text>
        {night.drinks.length ? <Text style={styles.noDrive}>NO DRIVING TONIGHT</Text> : null}
      </View>

      <TimeMachine />

      {data.setup === 'skipped' ? (
        <Pressable onPress={() => router.navigate('/options')} accessibilityRole="button" style={styles.nudge}>
          <Text style={styles.nudgeTxt}>You're using default stats. Set up your character for accurate numbers ›</Text>
        </Pressable>
      ) : null}

      {morning ? (
        <MorningReport night={morning.night} profile={profile} now={now} showCalories={settings.calories}
          onFeel={f => setMorning({ feel: f })} onClose={() => setMorning({ reportClosed: true })} />
      ) : null}

      <View style={[panel, styles.card]}>
        <HealthBar night={night} />

        <View style={styles.tally}>
          <View style={styles.glasses}>
            {night.drinks.length
              // Drinks, water and food in the order they were logged, so the water-to-drink ratio is visible at a glance.
              ? [...events].sort((a, b) => a.t - b.t).slice(0, 30).map(e =>
                  e.type === 'drink' ? <PixelSprite key={e.id} sprite={glassSprite(e)} scale={2} />
                  : <PixelSprite key={e.id} sprite={e.type === 'water' ? ICONS.hydrated : ICONS.lined} scale={1.5} />)
              : <Text style={styles.faint}>Your glasses stack up here.</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.tallyN}>{night.drinks.length} drink{night.drinks.length === 1 ? '' : 's'}</Text>
            {night.waters.length || night.foods.length ? (
              <Text style={styles.faint}>{night.waters.length} water · {night.foods.length} food</Text>
            ) : null}
            <Text style={styles.faint}>{total.toFixed(1)} std drinks</Text>
            {spent > 0 ? <Text style={styles.faint}>{money(spent)} spent</Text> : null}
          </View>
        </View>

        {critical ? (
          <View style={styles.danger}>
            <Text style={styles.dangerTitle}>Health is at 0</Text>
            <Text style={styles.dangerTxt}>Your estimated level is in a range where alcohol poisoning is a real risk. Stop drinking and make sure someone sober is with you.</Text>
            <Pressable onPress={reopenSafety} accessibilityRole="button">
              <Text style={styles.dangerLink}>Open the safety check-in</Text>
            </Pressable>
          </View>
        ) : highRange ? (
          <Pressable onPress={reopenSafety} accessibilityRole="button">
            <Text style={styles.dangerLink}>Open the safety check-in</Text>
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          <Button label="+ Drink" primary flex={2} onPress={() => setSheet(true)} />
          <Button label="Water" onPress={() => log({ type: 'water', id: newId(), t: currentTime() })} />
          <Button label="Food" onPress={() => log({ type: 'food', id: newId(), t: currentTime() })} />
          <Button label={endedAt ? 'Resume' : 'End night'} flex={1.3} onPress={() => setEnded(endedAt ? null : currentTime())} />
        </View>
        {removed ? (
          <View style={styles.undo}>
            <Text style={styles.undoTxt}>Removed {removed.type === 'drink' ? removed.name : removed.type === 'water' ? 'water' : 'food'}.</Text>
            <Pressable onPress={undo} accessibilityRole="button"><Text style={styles.undoBtn}>Undo</Text></Pressable>
          </View>
        ) : null}

        {/* Cause, then effect: what you've had (and the buttons to log more) sits above what it's doing to you. */}
        <StatusTray debuffs={fx.debuffs} buffs={fx.buffs} night={night} region={region} zone={zone} />
      </View>


      {settings.calories ? (
        <View style={[panel, styles.card]}>
          <View style={styles.logHead}><Text style={styles.h2}>Rations</Text><Text style={styles.faint}>Tonight's calories</Text></View>
          <Rations night={night} compareWith={settings.compareWith ?? 'pizza'} />
        </View>
      ) : null}

      <View style={[panel, styles.card]}>
        <View style={styles.logHead}><Text style={styles.h2}>Tonight's curve</Text><Text style={styles.faint}>Blood alcohol (est.)</Text></View>
        <CurveChart night={night} />
      </View>

      <View style={[panel, styles.card]}>
        <View style={styles.logHead}>
          <Text style={styles.h2}>Tonight's log</Text>
          {night.drinks.length ? <Text style={styles.faint}>{total.toFixed(1)} std drinks</Text> : null}
        </View>
        <NightLog events={events} region={region} onRemove={remove} />
        {data && data.past.length ? <Text style={styles.faint}>{data.past.length} earlier night{data.past.length === 1 ? '' : 's'} saved for History.</Text> : null}
      </View>

      <Text style={styles.fine}>Estimates only. Not a breathalyser and never a driving clearance. Your log is saved on this device only.</Text>
      {events.length === 0 ? (
        <Pressable onPress={loadSample} accessibilityRole="button"><Text style={styles.link}>Load a sample night</Text></Pressable>
      ) : null}
      {error ? <Text style={styles.warn}>{error}</Text> : null}

      <LogDrinkSheet visible={sheet && !showSafety} region={region} showCalories={settings.calories} highRange={night.bacNow >= WARNING_BAC}
        profile={profile} events={events} now={now} myDrinks={data.myDrinks ?? []}
        onClose={() => setSheet(false)} onPick={pickDrink}
        onSaveDrink={d => update(x => ({ ...x, myDrinks: [d, ...(x.myDrinks ?? []).filter(m => m.id !== d.id)] }))}
        onDeleteDrink={id => update(x => ({ ...x, myDrinks: (x.myDrinks ?? []).filter(m => m.id !== id) }))} />
      <SafetyCheck visible={showSafety} region={region} critical={critical}
        onWithSomeone={() => update(d => ({ ...d, tonight: { ...d.tonight, safetyAckAt: currentTime() } }))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clock: { fontFamily: fonts.num, fontSize: 28, color: colors.ink },
  noDrive: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, color: colors.bad, borderWidth: 2, borderColor: colors.alertEdge, paddingHorizontal: 7, paddingVertical: 4 },
  card: { padding: 14, gap: 14 },
  tally: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, backgroundColor: colors.sunk, padding: 10, minHeight: 50 },
  glasses: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 2 },
  tallyN: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  faint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.edgeHi, borderBottomWidth: 5, borderBottomColor: colors.edge },
  btnPrimary: { backgroundColor: colors.hp, borderColor: colors.hpHi, borderBottomColor: colors.hpLo },
  btnTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  h2: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 0.4, color: colors.ink },
  logHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nudge: { backgroundColor: '#3a3220', borderWidth: 2, borderColor: '#6a5424', padding: 12 },
  nudgeTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, lineHeight: 20 },
  undo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.ink, paddingHorizontal: 12, paddingVertical: 10 },
  undoTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.bg },
  undoBtn: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.hpLo, textDecorationLine: 'underline' },
  warn: { fontFamily: fonts.body, fontSize: 15, color: colors.alertInk, backgroundColor: colors.alertBg, borderWidth: 2, borderColor: colors.alertEdge, padding: 10 },
  danger: { backgroundColor: '#1e2a33', borderWidth: 2, borderColor: '#3f6275', padding: 14, gap: 6 },
  dangerTitle: { fontFamily: fonts.display, fontSize: 31, letterSpacing: 0.4, color: '#e9f6ff' },
  dangerTxt: { fontFamily: fonts.body, fontSize: 15, color: '#cfe3ef', lineHeight: 21 },
  dangerLink: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#9fd4f0', textDecorationLine: 'underline', marginTop: 4 },
  fine: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint, textAlign: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mana, textAlign: 'center', textDecorationLine: 'underline' },
});
