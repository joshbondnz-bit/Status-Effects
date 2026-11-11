// The night recap: tap a night in the History calendar and this sheet slides up with everything about it.
// Lowest HP and the zone reached, how you felt the next morning, the numbers (drinks, peak, money,
// calories, sleep, HRV), the night's curve against bedtime, every entry in the log, and the buffs and
// debuffs it caused. The arrows step to the previous or next night without closing the sheet.
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { useState } from 'react';
import {
  FEELS, PHASES, effects, hpFromBac, keyToTime, phaseIndex, simulateNight, standardDrinks, summarizeNight,
  type Effect, type Feel, type LogEvent, type Profile,
} from '../../../../engine/src/index.ts';
import type { FoodCompare } from '../../storage';
import { FOOD } from '../../food';
import { EFFECT_NAMES } from '../../copy';
import { ICONS, glassSprite } from '../../sprites';
import { clock, duration, money } from '../../format';
import { PixelSprite } from '../PixelSprite';
import { feelColors } from '../MorningReport';
import { fonts, makeStyles, useColors, type Palette } from '../../theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUR = 3_600_000;

/** One night as the recap needs it: its log and the morning check-in, if any. */
export interface RecapNight { events: LogEvent[]; feel?: Feel; endedAt?: number | null }

export function NightRecap({ dayKey, night, profile, now, showCalories, compareWith, prevKey, nextKey, onStep, onClose }: {
  dayKey: string | null; night: RecapNight | undefined; profile: Profile; now: number;
  showCalories: boolean; compareWith: FoodCompare;
  prevKey: string | null; nextKey: string | null; onStep: (key: string) => void; onClose: () => void;
}) {
  const colors = useColors();
  const styles = useStyles(colors);
  const insets = useSafeAreaInsets();
  const visible = !!(dayKey && night);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close the recap" />
      {visible ? (
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grab} />
          <View style={styles.top}>
            <Arrow label="‹" target={prevKey} onStep={onStep} a11y="Previous night" />
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>NIGHT RECAP · {fmtDay(dayKey!)}</Text>
              <Text style={styles.title} accessibilityRole="header">{new Date(keyToTime(dayKey!)).toLocaleDateString([], { weekday: 'long' })} night</Text>
            </View>
            <Arrow label="›" target={nextKey} onStep={onStep} a11y="Next night" />
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close the recap" style={styles.x}>
              <Text style={styles.xTxt}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingTop: 4 }} showsVerticalScrollIndicator={false}>
            <RecapBody night={night!} profile={profile} now={now} showCalories={showCalories} compareWith={compareWith} />
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

function fmtDay(key: string) {
  const d = new Date(keyToTime(key));
  return `${MONTHS[d.getMonth()].toUpperCase()} ${d.getDate()}`;
}

function Arrow({ label, target, onStep, a11y }: { label: string; target: string | null; onStep: (k: string) => void; a11y: string }) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <Pressable onPress={() => target && onStep(target)} disabled={!target} hitSlop={6} accessibilityRole="button" accessibilityLabel={a11y}
      style={[styles.nav, !target && { opacity: 0.3 }]}>
      <Text style={styles.navTxt}>{label}</Text>
    </Pressable>
  );
}

function RecapBody({ night, profile, now, showCalories, compareWith }: {
  night: RecapNight; profile: Profile; now: number; showCalories: boolean; compareWith: FoodCompare;
}) {
  const colors = useColors();
  const styles = useStyles(colors);
  const s = summarizeNight(profile, night.events);
  if (!s) return null;
  const sim = simulateNight({ profile, events: night.events, now });
  const fx = effects(sim, { calories: showCalories, endedAt: night.endedAt ?? null });
  const std = standardDrinks(s.grams, profile.region);
  const foods = night.events.filter(e => e.type === 'food').length;
  const spent = Math.round(night.events.reduce((t, e) => t + (e.type === 'drink' ? e.cost ?? 0 : 0), 0) * 100) / 100;
  const priced = night.events.some(e => e.type === 'drink' && e.cost != null);
  const lowHp = s.critical ? 0 : Math.round(hpFromBac(s.peak));
  const zone = s.critical ? 'Critical' : PHASES[phaseIndex(s.peak)].name;
  const lastDrink = Math.max(...night.events.filter(e => e.type === 'drink').map(e => e.t));
  const hours = Math.max(0.5, (lastDrink - s.start) / HOUR);
  const food = FOOD[compareWith];
  const servings = s.kcal / food.kcal;

  // How long it lasted, rounded: "45m", "10h".
  const lasted = (e: Effect) => (!isFinite(e.end) ? '' : e.end - e.start < HOUR ? duration(e.end - e.start) : `${Math.round((e.end - e.start) / HOUR)}h`);
  const buffs = fx.buffs.filter(e => isFinite(e.end));
  const worst = [...fx.debuffs].sort((a, b) => (b.severity ?? -1) - (a.severity ?? -1) || (b.end - b.start) - (a.end - a.start)).slice(0, 4);

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.hero}>
        <Ring hp={lowHp} zone={zone} critical={s.critical} />
        <View style={{ flex: 1, gap: 8 }}>
          {s.critical ? <Text style={styles.alert}>Blood alcohol reached the critical range.</Text> : null}
          {night.feel != null ? (
            <View style={[styles.feel, { borderColor: feelColors(colors)[night.feel] }]}>
              <Text style={[styles.feelTxt, { color: feelColors(colors)[night.feel] }]}>Woke up feeling {FEELS[night.feel].toLowerCase()}</Text>
            </View>
          ) : (
            <View style={[styles.feel, { borderColor: colors.inkFaint }]}><Text style={styles.feelNone}>Morning check-in: not rated</Text></View>
          )}
          <Text style={styles.line}><Text style={styles.bold}>{s.drinks} drink{s.drinks === 1 ? '' : 's'}</Text> over {hours.toFixed(1)} h · {(s.drinks / hours).toFixed(1)} an hour</Text>
          <Text style={styles.line}>{clock(s.start)} – {clock(lastDrink)}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat k="Drinks" v={`${s.drinks} · ${std.toFixed(1)} std`} sub={`${s.waters} water · ${foods} food`} />
        <Stat k="Peak" v={`${s.peak.toFixed(3)}%`} sub={zone} />
        <Stat k="Spent" v={priced ? money(spent) : '—'} sub={priced ? `${money(Math.round(spent / s.drinks * 100) / 100)} a drink` : 'No prices set'} />
        {showCalories
          ? <Stat k="Calories" v={`${s.kcal.toLocaleString()} kcal`} sub={`≈ ${servings.toFixed(1)} ${servings === 1 ? food.one : food.many}`} />
          : <Stat k="Clear by" v={sim.clearedAt ? clock(sim.clearedAt) : '—'} sub="alcohol fully gone" />}
        <Stat k="Sleep" v={s.sleepHoursAffected > 0 ? `${s.sleepHoursAffected.toFixed(1)} h hit` : 'Clear'} sub={s.sleepHoursAffected > 0 ? 'with alcohol in your system' : 'Alcohol gone by bedtime'} />
        <Stat k="HRV" v={s.hrvDropPct != null ? `≈ −${s.hrvDropPct}%` : 'Normal'} sub="overnight recovery" />
      </View>

      <Section title="The curve" note="blood alcohol vs bedtime" />
      <RecapCurve samples={sim.samples} t0={sim.t0} bed={sim.bed} end={sim.clearedAt ?? sim.wake} peak={s.peak} />

      <Section title="The log" note={`${night.events.length} entr${night.events.length === 1 ? 'y' : 'ies'}`} />
      <View style={styles.log}>
        {[...night.events].sort((a, b) => a.t - b.t).map(e => (
          <View key={e.id} style={styles.logItem}>
            <PixelSprite sprite={e.type === 'drink' ? glassSprite(e) : e.type === 'water' ? ICONS.hydrated : ICONS.lined} scale={1.5} />
            <Text style={styles.logT}>{clock(e.t)}</Text>
          </View>
        ))}
      </View>

      {buffs.length ? <><Section title="Buffs earned" /><Chips list={buffs} lasted={lasted} /></> : null}
      {worst.length ? <><Section title="Worst debuffs" /><Chips list={worst} lasted={lasted} /></> : null}
    </View>
  );
}

function Ring({ hp, zone, critical }: { hp: number; zone: string; critical: boolean }) {
  const colors = useColors();
  const styles = useStyles(colors);
  // Drains clockwise from the top like the main HP ring: the filled arc runs from the drained point round to
  // 12 o'clock. Drawn as a plain arc path (no transforms, which the web build warns about).
  const R = 46;
  const pt = (deg: number) => `${(56 + R * Math.sin(deg * Math.PI / 180)).toFixed(2)} ${(56 - R * Math.cos(deg * Math.PI / 180)).toFixed(2)}`;
  const from = 360 * (1 - hp / 100);
  const arc = `M ${pt(from)} A ${R} ${R} 0 ${360 - from > 180 ? 1 : 0} 1 ${pt(359.99)}`;
  return (
    <View style={styles.ring} accessible accessibilityLabel={`Lowest HP ${hp} of 100, ${zone}`}>
      <Svg width={112} height={112} style={{ position: 'absolute' }}>
        <Circle cx={56} cy={56} r={R} fill="none" stroke={colors.track2} strokeWidth={10} />
        {hp >= 100 ? <Circle cx={56} cy={56} r={R} fill="none" stroke={colors.hp} strokeWidth={10} />
          : hp > 0 ? <Path d={arc} fill="none" stroke={colors.hp} strokeWidth={10} /> : null}
        <Circle cx={56} cy={56} r={R + 6} fill="none" stroke={colors.edge} strokeWidth={2} />
        <Circle cx={56} cy={56} r={R - 6} fill="none" stroke={colors.edge} strokeWidth={2} />
      </Svg>
      <Text style={styles.ringN}>{hp}<Text style={styles.ringOf}>/100</Text></Text>
      <Text style={[styles.ringZone, critical && { color: colors.bad }]}>{zone}</Text>
      <Text style={styles.ringCap}>LOWEST HP</Text>
    </View>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub: string }) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <View style={styles.stat}>
      <Text style={styles.statK}>{k.toUpperCase()}</Text>
      <Text style={styles.statV}>{v}</Text>
      <Text style={styles.statS}>{sub}</Text>
    </View>
  );
}

function Section({ title, note }: { title: string; note?: string }) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <View style={styles.sec}>
      <Text style={styles.secT}>{title}</Text>
      {note ? <Text style={styles.secN}>{note}</Text> : null}
    </View>
  );
}

function Chips({ list, lasted }: { list: Effect[]; lasted: (e: Effect) => string }) {
  const colors = useColors();
  const styles = useStyles(colors);
  const edge = (e: Effect) => (e.kind === 'buff' ? colors.buff
    : e.severity == null ? colors.sevUnrated : [colors.sevMinor, colors.sevModerate, colors.sevSevere][e.severity]);
  return (
    <View style={styles.chips}>
      {list.map(e => (
        <View key={e.id} style={[styles.chip, { borderColor: edge(e) }]}>
          <PixelSprite sprite={ICONS[e.id]} scale={1} />
          <Text style={styles.chipTxt}>{EFFECT_NAMES[e.id]}</Text>
          {lasted(e) ? <Text style={styles.chipT}>{lasted(e)}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** The whole night's blood alcohol, first drink to fully clear, with bedtime and the peak marked. */
function RecapCurve({ samples, t0, bed, end, peak }: { samples: number[]; t0: number; bed: number; end: number; peak: number }) {
  const colors = useColors();
  const styles = useStyles(colors);
  const [w, setW] = useState(0);
  const H = 104, pad = 6, base = H - 16;
  const mins = Math.max(10, Math.min(samples.length - 1, Math.ceil((end - t0) / 60000) + 10));
  const maxB = Math.max(0.12, peak * 1.15);
  const X = (m: number) => pad + (m / mins) * (w - pad * 2);
  const Y = (b: number) => base - (b / maxB) * (base - 12);
  let d = '', pk = 0;
  for (let m = 0; m <= mins; m += 2) { d += `${m ? 'L' : 'M'}${X(m).toFixed(1)},${Y(samples[m] ?? 0).toFixed(1)}`; if ((samples[m] ?? 0) > (samples[pk] ?? 0)) pk = m; }
  const bedM = (bed - t0) / 60000;
  const font = { fontFamily: fonts.body, fontSize: 10 };
  return (
    <View style={styles.chart} onLayout={e => setW(e.nativeEvent.layout.width - 8)}
      accessible accessibilityLabel={`Blood alcohol over the night, peaking at ${peak.toFixed(3)} percent`}>
      {w > 0 ? (
        <Svg width={w} height={H}>
          {([[0.08, 'Drunk'], [0.15, 'Warning'], [0.25, 'Critical']] as const).filter(([b]) => b < maxB).map(([b, l]) => (
            <G key={l}>
              <Line x1={pad} x2={w - pad} y1={Y(b)} y2={Y(b)} stroke={colors.inkFaint} strokeDasharray="2 4" strokeWidth={1} />
              <SvgText x={w - pad} y={Y(b) - 3} textAnchor="end" fill={colors.inkFaint} {...font}>{`${l} ${b.toFixed(2)}`}</SvgText>
            </G>
          ))}
          <Path d={`${d}L${X(mins)},${base}L${X(0)},${base}Z`} fill={colors.hp} opacity={0.18} />
          <Path d={d} fill="none" stroke={colors.hp} strokeWidth={2.5} strokeLinejoin="round" />
          {bedM > 0 && bedM < mins ? (
            <>
              <Line x1={X(bedM)} x2={X(bedM)} y1={6} y2={base} stroke={colors.mana} strokeWidth={1.5} strokeDasharray="3 3" />
              <SvgText x={X(bedM) + 4} y={base - 4} fill={colors.mana} {...font}>Bed</SvgText>
            </>
          ) : null}
          <Circle cx={X(pk)} cy={Y(samples[pk] ?? 0)} r={3.5} fill={colors.hp} stroke={colors.edge} strokeWidth={1.5} />
          <SvgText x={Math.min(X(pk), w - 70)} y={Math.max(Y(samples[pk] ?? 0) - 7, 24)} fill={colors.ink} {...font}>{`Peak ${peak.toFixed(3)}%`}</SvgText>
          <Line x1={pad} x2={w - pad} y1={base} y2={base} stroke={colors.edgeHi} strokeWidth={1} />
          <SvgText x={pad} y={H - 3} fill={colors.inkFaint} {...font}>{clock(t0)}</SvgText>
          <SvgText x={w - pad} y={H - 3} textAnchor="end" fill={colors.inkFaint} {...font}>{`clear ${clock(t0 + mins * 60000)}`}</SvgText>
        </Svg>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(9,7,14,0.6)' },
  sheet: { backgroundColor: colors.panel, borderTopWidth: 3, borderColor: colors.edgeHi, borderTopLeftRadius: 12, borderTopRightRadius: 12,
    paddingHorizontal: 14, paddingTop: 8, maxHeight: '90%' },
  grab: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.edgeHi, alignSelf: 'center', marginBottom: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, color: colors.inkFaint },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 32, color: colors.ink },
  nav: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.edge, borderRadius: 4 },
  navTxt: { fontFamily: fonts.num, fontSize: 28, lineHeight: 30, color: colors.ink },
  x: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  xTxt: { fontSize: 26, color: colors.inkDim },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ring: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  ringN: { fontFamily: fonts.num, fontSize: 32, lineHeight: 30, color: colors.ink },
  ringOf: { fontSize: 16, color: colors.inkDim },
  ringZone: { fontFamily: fonts.display, fontSize: 16, color: colors.hp },
  ringCap: { position: 'absolute', bottom: -4, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1, color: colors.inkFaint },
  alert: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.bad },
  feel: { alignSelf: 'flex-start', borderWidth: 2, borderRadius: 4, backgroundColor: colors.sunk, paddingHorizontal: 8, paddingVertical: 2 },
  feelTxt: { fontFamily: fonts.display, fontSize: 18 },
  feelNone: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
  line: { fontFamily: fonts.body, fontSize: 13, color: colors.inkDim },
  bold: { fontFamily: fonts.bodyBold, color: colors.ink },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stat: { flexBasis: '48%', flexGrow: 1, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edge, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 6 },
  statK: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, color: colors.inkFaint },
  statV: { fontFamily: fonts.num, fontSize: 22, lineHeight: 24, color: colors.ink },
  statS: { fontFamily: fonts.body, fontSize: 11, color: colors.inkDim },
  sec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 },
  secT: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  secN: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  chart: { backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edge, borderRadius: 4, padding: 2 },
  log: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  logItem: { width: 40, alignItems: 'center', gap: 2 },
  logT: { fontFamily: fonts.num, fontSize: 13, color: colors.inkFaint },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderRadius: 4, backgroundColor: colors.sunk, paddingVertical: 3, paddingLeft: 4, paddingRight: 8 },
  chipTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.ink },
  chipT: { fontFamily: fonts.num, fontSize: 15, color: colors.inkFaint },
}));
