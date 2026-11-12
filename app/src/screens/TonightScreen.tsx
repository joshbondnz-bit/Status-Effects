import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import {
  MIN, PHASES, WARNING_BAC, effects, healthState, lingeringDebuffs, makeDrink, phaseIndex, simulateNight, standardDrinks, withLingering,
  type DrinkSpec, type LogEvent,
} from '../../../engine/src/index.ts';
import { newId, sampleNightEvents } from '../sampleNight';
import { useColors, makeStyles, type Palette, fonts, panelStyles } from '../theme';
import { glassSprite, type SpriteDef } from '../sprites';
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
import { phaseCopy } from '../copy';
import { useApp } from '../AppDataProvider';


/** A pint, for the + Drink button. */
const DRINK_ICON = glassSprite({ type: 'drink', id: 'icon', t: 0, name: 'Lager', ml: 568, abv: 5, category: 'beer', grams: 0, kcal: 0, kcalFromAlcohol: 0 });

function Button({ label, onPress, variant = 'plain', icon, big, flex = 1 }: {
  label: string; onPress: () => void; variant?: 'primary' | 'water' | 'plain'; icon?: SpriteDef; big?: boolean; flex?: number;
}) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.btn, variant === 'primary' && styles.btnPrimary, variant === 'water' && styles.btnWater, big && styles.btnBig, { flex }, pressed && { transform: [{ translateY: 2 }] }]}>
      {icon ? <PixelSprite sprite={icon} scale={big ? 2 : 1.5} /> : null}
      <Text style={[styles.btnTxt, big && styles.btnTxtBig, variant === 'primary' && { color: '#fff8ee' }, variant === 'water' && { color: colors.waterInk }]}>{label}</Text>
    </Pressable>
  );
}

export function TonightScreen() {
  const colors = useColors();
  const styles = useStyles(colors);
  const { panel } = panelStyles(colors);
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  // "What if one more?" is shared by the Sleep forecast and Rations.
  const [whatIf, setWhatIf] = useState(false);
  const [removed, setRemoved] = useState<LogEvent | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data, error, update, now, tick, currentTime } = useApp();

  const { profile, settings } = data;
  const events = data.tonight.events;
  const endedAt = data.tonight.endedAt;
  const night = useMemo(() => simulateNight({ profile, events, now }), [profile, events, now]);
  const tonightFx = useMemo(() => effects(night, { calories: settings.calories, endedAt }), [night, settings.calories, endedAt]);
  // Debuffs still running from earlier nights (Slow recovery, Hangover…), worked out once a minute.
  // Ones that tonight causes again stack with tonight's; the rest show in their own "Lingering" row.
  const minute = Math.floor(now / 60_000);
  const past = data.past;
  const carried = useMemo(() => lingeringDebuffs(profile, past.map(n => n.events), minute * 60_000, { calories: settings.calories }),
    [profile, past, minute, settings.calories]);
  const stacked = withLingering(tonightFx.debuffs, carried.debuffs);
  const fx = { buffs: tonightFx.buffs, debuffs: stacked.debuffs };
  const region = profile.region;
  // People are badly impaired well before 0 HP, so the safety check-in appears from the Wasted zone (0.15%+)
  // as well as at 0 HP, and comes back every 30 minutes while the level stays that high.
  const critical = healthState(night) === 'critical';
  // The current zone and what it means, shown under Status (it describes the state you're in).
  const zoneK = night.bacNow >= 0.25 ? 6 : phaseIndex(night.bacNow);
  const zone = {
    name: critical ? 'Critical' : PHASES[zoneK].name,
    text: phaseCopy(zoneK, region),
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
  const pickDrink = (spec: DrinkSpec, minutesAgo: number) => { log(makeDrink(spec, currentTime() - minutesAgo * MIN, newId())); setSheet(false); };
  // Nudge a logged entry's time (never into the future).
  const shift = (e: LogEvent, minutes: number) => {
    const t = Math.min(currentTime(), e.t + minutes * MIN);
    update(d => ({ ...d, tonight: { ...d.tonight, events: d.tonight.events.map(x => (x.id === e.id ? { ...x, t } : x)) } }));
  };
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

        {/* + Drink is the main action: its own full-width row. Easy to find, but no glow or bounce, so it never looks like a reward. */}
        <View style={styles.actionsCol}>
          <Button label="+ Drink" variant="primary" big icon={DRINK_ICON} onPress={() => setSheet(true)} />
          <View style={styles.actions}>
            <Button label="Water" variant="water" icon={ICONS.hydrated} onPress={() => log({ type: 'water', id: newId(), t: currentTime() })} />
            <Button label="Food" icon={ICONS.lined} onPress={() => log({ type: 'food', id: newId(), t: currentTime() })} />
            <Button label={endedAt ? 'Resume' : 'Call it'} icon={endedAt ? undefined : ICONS.called} flex={1.15} onPress={() => (endedAt ? setEnded(null) : setConfirmEnd(true))} />
          </View>
        </View>
        {confirmEnd ? (
          <View style={styles.confirm} accessibilityLiveRegion="polite">
            <Text style={styles.confirmTitle}>Call it for tonight?</Text>
            <Text style={styles.confirmTxt}>Stopping before bedtime earns the Called it buff: less alcohol in your system at bedtime means better sleep. Tonight's log is kept, and you can tap Resume if you change your mind.</Text>
            <Text style={styles.confirmTxt}><Text style={styles.fineBold}>Getting home:</Text> take a taxi, rideshare or transit, or ride with someone who hasn't been drinking. Never drive.</Text>
            <View style={styles.actions}>
              <Button label="Yes, call it" variant="primary" onPress={() => { setEnded(currentTime()); setConfirmEnd(false); }} />
              <Button label="Not yet" onPress={() => setConfirmEnd(false)} />
            </View>
          </View>
        ) : null}
        {removed ? (
          <View style={styles.undo}>
            <Text style={styles.undoTxt}>Removed {removed.type === 'drink' ? removed.name : removed.type === 'water' ? 'water' : 'food'}.</Text>
            <Pressable onPress={undo} accessibilityRole="button"><Text style={styles.undoBtn}>Undo</Text></Pressable>
          </View>
        ) : null}

        {/* Cause, then effect: what you've had (and the buttons to log more) sits above what it's doing to you. */}
        <StatusTray debuffs={fx.debuffs} buffs={fx.buffs} lingering={stacked.lingering} sources={carried.nights} night={night} region={region} zone={zone} />
      </View>

      <View style={[panel, styles.card]}>
        <View style={styles.logHead}><Text style={styles.h2}>Sleep forecast</Text><Text style={styles.faint}>Blood alcohol vs bedtime</Text></View>
        <CurveChart night={night} whatIf={whatIf} onWhatIf={setWhatIf} />
      </View>

      {settings.calories ? (
        <View style={[panel, styles.card]}>
          <View style={styles.logHead}><Text style={styles.h2}>Rations</Text><Text style={styles.faint}>Tonight's calories</Text></View>
          <Rations night={night} compareWith={settings.compareWith ?? 'pizza'} whatIf={whatIf} fatPauseMs={fx.debuffs.find(e => e.id === 'fatpause')?.data?.pausedMs} />
        </View>
      ) : null}

      <View style={[panel, styles.card]}>
        <View style={styles.logHead}>
          <Text style={styles.h2}>Tonight's log</Text>
          {night.drinks.length ? <Text style={styles.faint}>{total.toFixed(1)} std drinks</Text> : null}
        </View>
        <NightLog events={events} region={region} onRemove={remove} onShift={shift} now={now} />
        {data && data.past.length ? <Text style={styles.faint}>{data.past.length} earlier night{data.past.length === 1 ? '' : 's'} saved for History.</Text> : null}
      </View>

      <Text style={styles.fine}><Text style={styles.fineBold}>Never drink and drive.</Text> Every number here is an estimate, not a breathalyser reading or a driving clearance. Your log is saved on this device only.</Text>
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

const useStyles = makeStyles((colors: Palette) => ({
  page: { paddingHorizontal: 16, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clock: { fontFamily: fonts.num, fontSize: 28, color: colors.ink },
  noDrive: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, color: colors.bad, borderWidth: 2, borderColor: colors.alertEdge, paddingHorizontal: 7, paddingVertical: 4 },
  card: { padding: 14, gap: 14 },
  tally: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, backgroundColor: colors.sunk, padding: 10, minHeight: 50 },
  glasses: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 2 },
  tallyN: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  faint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint },
  actionsCol: { gap: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flexDirection: 'row', gap: 6, paddingVertical: 11, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.edgeHi, borderBottomWidth: 5, borderBottomColor: colors.edge },
  btnPrimary: { backgroundColor: colors.hp, borderColor: colors.hpHi, borderBottomColor: colors.hpLo },
  btnWater: { backgroundColor: colors.waterBg, borderColor: colors.waterEdge, borderBottomColor: colors.waterEdgeLo },
  btnBig: { paddingVertical: 14, gap: 10 },
  btnTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  btnTxtBig: { fontSize: 18 },
  confirm: { backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi, padding: 12, gap: 8 },
  confirmTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  confirmTxt: { fontFamily: fonts.body, fontSize: 14, color: colors.inkDim, lineHeight: 20 },
  h2: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 0.4, color: colors.ink },
  logHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nudge: { backgroundColor: colors.nudgeBg, borderWidth: 2, borderColor: colors.nudgeEdge, padding: 12 },
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
  fineBold: { fontFamily: fonts.bodyBold, color: colors.ink },
  link: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mana, textAlign: 'center', textDecorationLine: 'underline' },
}));
