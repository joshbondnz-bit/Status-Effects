// The HP ring: health as a ring that drains clockwise from the top, with HP in the middle.
// Six segments, one per zone. Incoming damage is a darker arc ahead of the drain, healing a green arc behind it.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import {
  FED_WINDOW, PHASES, WARNING_BAC, healthState, hpFromBac, hpGainNextHour, hpLossNextHour, phaseIndex, simulateNight, type Night,
} from '../../../engine/src/index.ts';
import { colors, fonts } from '../theme';
import { HEART } from '../sprites';
import { PixelSprite } from './PixelSprite';
import { PHASE_COPY } from '../copy';
import { clock } from '../format';
import { useReduceMotion } from '../useReduceMotion';

/** The native animation driver isn't available on web (used only for browser testing). */
const NATIVE = Platform.OS !== 'web';

// ----- Ring geometry (in a 240-unit drawing, padded so the tick labels fit) -----
const C = 120, R = 92;
const VIEW = '-10 -10 260 260';
/** Light top, main and dark bottom bands, like the old bar's bevel, as three concentric rings. */
const BANDS = [{ r: 99, w: 5 }, { r: 93, w: 8 }, { r: 86, w: 6 }];
const FILL = [colors.hpHi, colors.hp, colors.hpLo];
const TRACK = ['#4a2030', '#3a1824', '#2c1220'];
const DMG = ['#9c4652', '#76182e', '#460a1b'];
const HEAL = ['rgba(127,240,184,0.55)', 'rgba(95,211,154,0.42)', 'rgba(60,160,112,0.34)'];
/** Blood alcohol at each zone boundary, going clockwise from the top. */
const TICKS = ['.02', '.05', '.08', '.11', '.15'];

/** A point on the ring: 0° is the top, angles go clockwise. */
function pt(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
}
/** An arc from fraction a to b of a full turn (clockwise from the top). */
function arc(r: number, a: number, b: number): string {
  if (b - a <= 0.0005) return '';
  if (b - a >= 0.9995) return `M ${C} ${C - r} A ${r} ${r} 0 1 1 ${C} ${C + r} A ${r} ${r} 0 1 1 ${C} ${C - r}`;
  const [x1, y1] = pt(a * 360, r), [x2, y2] = pt(b * 360, r);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${b - a > 0.5 ? 1 : 0} 1 ${x2} ${y2}`;
}
function Arcs({ a, b, palette }: { a: number; b: number; palette: string[] }) {
  if (b - a <= 0.0005) return null;
  return <>{BANDS.map((band, i) => <Path key={i} d={arc(band.r, a, b)} stroke={palette[i]} strokeWidth={band.w} fill="none" />)}</>;
}

type PopKind = 'dmg' | 'heal' | 'spark' | 'ember';
type PopItem = { id: number; text: string; kind: PopKind; x: number; y: number };

/** Floating numbers drift up; sparkles rise; embers fall. Each fades out. */
function Pop({ text, kind, x, y }: Omit<PopItem, 'id'>) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: kind === 'ember' ? 900 : 1200, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }).start(); }, [v, kind]);
  const travel = kind === 'ember' ? 24 : kind === 'spark' ? -28 : -34;
  const style = {
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) }],
  };
  if (kind === 'spark' || kind === 'ember') {
    return <Animated.View style={[styles.particle, { left: x - 2, top: y - 2, backgroundColor: kind === 'spark' ? '#7ff0b8' : '#ff6a6f' }, style]} />;
  }
  return <Animated.Text style={[styles.pop, { left: x - 16, top: y - 18, color: kind === 'dmg' ? '#ff6a6f' : '#6fe3a8' }, style]}>{text}</Animated.Text>;
}

export function HealthBar({ night }: { night: Night }) {
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const size = Math.min(260, width - 72);
  const scale = size / 260; // drawing units → px (the view box is 260 wide)
  const toPx = ([x, y]: [number, number]): [number, number] => [(x + 10) * scale, (y + 10) * scale];

  const state = healthState(night);
  const hp = hpFromBac(night.bacNow);
  const incoming = hp - hpFromBac(night.futurePeak);
  const critical = state === 'critical', stabilising = state === 'stabilising', warning = state === 'warning';
  const taking = !critical && !stabilising && incoming > 0.5;
  const healing = !critical && !stabilising && !taking && night.bacNow > 0;
  const loss = hpLossNextHour(night), gain = hpGainNextHour(night);
  // Which way health is moving drives the constant animations.
  const direction: 'down' | 'up' | null = taking ? 'down' : healing || stabilising ? 'up' : null;
  const headingForCritical = night.criticalAt != null && night.criticalAt > night.now;

  // If food is slowing things down, work out what the next hour would cost on an empty stomach.
  const fedNow = night.foods.some(f => f.t <= night.now && night.now - f.t < FED_WINDOW);
  const emptyStomachLoss = useMemo(() => {
    if (!fedNow || !taking) return null;
    const without = simulateNight({ profile: night.profile, events: [...night.drinks, ...night.waters], now: night.now });
    return hpLossNextHour(without);
  }, [fedNow, taking, night]);

  const k = night.bacNow >= 0.25 ? 6 : phaseIndex(night.bacNow);
  const zoneColor = critical || k >= 5 ? colors.bad : k >= 3 ? colors.warn : colors.ink;

  // ----- Ring fractions (clockwise from the top). The drain sweeps clockwise, so the filled part ends at the top. -----
  const f = hp / 100;
  const tip = 1 - f;
  const dmgEnd = taking ? Math.min(1, 1 - (hp - incoming) / 100) : tip;
  const showHeal = (healing || stabilising) && gain > 0.3;
  const healStart = showHeal ? Math.max(0, 1 - Math.min(100, hp + gain) / 100) : tip;
  const tipDeg = tip * 360;

  // ----- Animations -----
  const [pops, setPops] = useState<PopItem[]>([]);
  const popId = useRef(0), prevHp = useRef<number | null>(null), acc = useRef(0);
  const heartX = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const edgeGlow = useRef(new Animated.Value(0.4)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const tipRef = useRef(tipDeg);
  tipRef.current = tipDeg;

  const addPop = (p: Omit<PopItem, 'id'>) => {
    const id = popId.current++;
    setPops(list => [...list.slice(-24), { ...p, id }]);
    setTimeout(() => setPops(list => list.filter(x => x.id !== id)), 1300);
  };
  const tipPoint = (jitter = 0) => toPx(pt(tipRef.current, R + 1 + jitter));

  // Floating numbers whenever health actually changes.
  useEffect(() => {
    const prev = prevHp.current;
    prevHp.current = hp;
    if (prev == null || Math.abs(hp - prev) > 25) { acc.current = 0; return; }
    const d = hp - prev;
    acc.current = d < 0 ? Math.min(0, acc.current) + d : Math.max(0, acc.current) + d;
    if (reduceMotion || Math.abs(acc.current) < 1) return;
    const n = Math.round(Math.abs(acc.current));
    acc.current -= Math.sign(acc.current) * n;
    const [x, y] = tipPoint();
    addPop({ text: d < 0 ? `−${n}` : `+${n}`, kind: d < 0 ? 'dmg' : 'heal', x, y });
  }, [hp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Constant motion at the tip while health is moving: embers fall when draining, sparkles rise when healing.
  useEffect(() => {
    if (!direction || reduceMotion) return;
    const id = setInterval(() => {
      const [x, y] = tipPoint(Math.random() * 14 - 7);
      addPop({ text: '', kind: direction === 'down' ? 'ember' : 'spark', x, y });
    }, 300);
    return () => clearInterval(id);
  }, [direction, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Heart: a flinch every couple of seconds while draining, a steady heartbeat while healing.
  useEffect(() => {
    heartScale.setValue(1); heartX.setValue(0);
    if (!direction || reduceMotion) return;
    const anim = direction === 'up'
      ? Animated.loop(Animated.sequence([
          Animated.timing(heartScale, { toValue: 1.2, duration: 160, useNativeDriver: NATIVE }),
          Animated.timing(heartScale, { toValue: 1.04, duration: 140, useNativeDriver: NATIVE }),
          Animated.timing(heartScale, { toValue: 1.15, duration: 140, useNativeDriver: NATIVE }),
          Animated.timing(heartScale, { toValue: 1, duration: 300, useNativeDriver: NATIVE }),
          Animated.delay(700),
        ]))
      : Animated.loop(Animated.sequence([
          ...[-4, 4, -3, 2, 0].map(x => Animated.timing(heartX, { toValue: x, duration: 60, useNativeDriver: NATIVE })),
          Animated.delay(1900),
        ]));
    anim.start();
    return () => anim.stop();
  }, [direction, reduceMotion, heartScale, heartX]);

  // A glow at the tip that breathes: white-hot while draining, green while healing.
  useEffect(() => {
    if (!direction || reduceMotion) { edgeGlow.setValue(direction ? 1 : 0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(edgeGlow, { toValue: 1, duration: 500, useNativeDriver: NATIVE }),
      Animated.timing(edgeGlow, { toValue: 0.35, duration: 500, useNativeDriver: NATIVE }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [direction, reduceMotion, edgeGlow]);

  // Pulsing chip and ring glow when critical or warning (warning pulses more slowly).
  useEffect(() => {
    if ((!critical && !warning) || reduceMotion) { pulse.setValue(1); return; }
    const ms = critical ? 550 : 900;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.45, duration: ms, useNativeDriver: NATIVE }),
      Animated.timing(pulse, { toValue: 1, duration: ms, useNativeDriver: NATIVE }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [critical, warning, reduceMotion, pulse]);

  // The shine: a soft highlight slides along the incoming-damage arc (clockwise, the way health drains)
  // or back along the healing arc. Drawn once at the top and rotated, so it runs on the native driver.
  const shineFrom = tipDeg;
  const shineTo = direction === 'down' ? (dmgEnd + 0.02) * 360 : (healStart - 0.02) * 360;
  const shineSpan = Math.abs(shineTo - shineFrom);
  const shineOn = !reduceMotion && !!direction && shineSpan > 8 && (direction === 'down' ? taking : showHeal);
  useEffect(() => {
    if (!shineOn) return;
    sweep.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(direction === 'down' ? 700 : 1800), // draining shines more often
      Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
      Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: NATIVE }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [shineOn, direction, sweep]);
  const a0 = Math.round(shineFrom - 7.2), a1 = Math.round(shineTo - 7.2);
  const shineStyle = useMemo(() => ({
    opacity: sweep.interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 1, 1, 0] }),
    transform: [{ rotate: sweep.interpolate({ inputRange: [0, 1], outputRange: [`${a0}deg`, `${a1}deg`] }) }],
  }), [sweep, a0, a1]);

  // ----- Words -----
  const rateNum = (n: number) => Math.max(1, Math.round(n));
  const chip = critical ? { text: 'CRITICAL', style: styles.chipCrit } : stabilising ? { text: 'STABILISING', style: styles.chipStab }
    : warning ? { text: 'WARNING', style: styles.chipWarn }
    // The drain figure is what's lost over the next hour (heaviest while drinks absorb), shown as at least 1.
    : taking ? { text: `▼ DRAINING · ${rateNum(loss)} HP/HR`, style: styles.chipDmg }
    : healing ? { text: `▲ REGENERATING · ${rateNum(gain)} HP/HR`, style: styles.chipHeal } : null;
  const [ex1, ey1] = pt(tipDeg, R - 11), [ex2, ey2] = pt(tipDeg, R + 11);

  return (
    <View style={{ gap: 10 }}>
      <View style={[styles.ringBox, { width: size, height: size }]}
        accessibilityRole="progressbar" accessibilityLabel={`Health ${Math.round(hp)} of 100, ${critical ? 'critical' : PHASES[k].name}${chip ? ', ' + chip.text.toLowerCase().replace(/[▼▲]/g, '') : ''}`}>
        <Svg width={size} height={size} viewBox={VIEW}>
          <Circle cx={C} cy={C} r={104} stroke={colors.edge} strokeWidth={3} fill="none" />
          <Circle cx={C} cy={C} r={81} stroke={colors.edge} strokeWidth={3} fill="none" />
          <Arcs a={0} b={1} palette={TRACK} />
          {showHeal ? <Arcs a={healStart} b={tip} palette={HEAL} /> : null}
          <Arcs a={tip} b={1} palette={FILL} />
          {taking ? <Arcs a={tip} b={dmgEnd} palette={DMG} /> : null}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const [x1, y1] = pt(i * 60, R - 13), [x2, y2] = pt(i * 60, R + 13);
            return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.edge} strokeWidth={4} />;
          })}
          {TICKS.map((t, i) => {
            const [x, y] = pt((i + 1) * 60, R + 24);
            return <SvgText key={t} x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight="700" fill={colors.inkFaint} fontFamily={fonts.bodyBold}>{t}</SvgText>;
          })}
        </Svg>

        {shineOn ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, shineStyle]}>
            <Svg width={size} height={size} viewBox={VIEW}>
              <Path d={arc(93, 0, 0.04)} stroke="rgba(255,255,255,0.38)" strokeWidth={19} fill="none" />
            </Svg>
          </Animated.View>
        ) : null}
        {direction && hp > 0 && hp < 100 ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: edgeGlow }]}>
            <Svg width={size} height={size} viewBox={VIEW}>
              <Line x1={ex1} y1={ey1} x2={ex2} y2={ey2} stroke={direction === 'down' ? '#ffffff' : colors.good} strokeWidth={4} />
            </Svg>
          </Animated.View>
        ) : null}
        {critical || warning ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: pulse }]}>
            <Svg width={size} height={size} viewBox={VIEW}>
              <Circle cx={C} cy={C} r={93} stroke={critical ? 'rgba(255,60,80,0.3)' : 'rgba(255,154,61,0.22)'} strokeWidth={30} fill="none" />
            </Svg>
          </Animated.View>
        ) : null}

        <View pointerEvents="none" style={styles.center}>
          <Animated.View style={{ transform: [{ translateX: heartX }, { scale: heartScale }] }}>
            <PixelSprite sprite={HEART} scale={3} dim={critical} />
          </Animated.View>
          <Text style={[styles.hpNum, { fontSize: Math.round(76 * scale) }]}>
            {Math.round(hp)}<Text style={[styles.hpMax, { fontSize: Math.round(30 * scale) }]}>/100</Text>
          </Text>
          <Text style={[styles.zone, { color: zoneColor, fontSize: Math.round(28 * scale) }]}>{critical ? 'Critical' : PHASES[k].name}</Text>
        </View>

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {pops.map(p => <Pop key={p.id} {...p} />)}
        </View>
      </View>

      {chip ? <Animated.Text style={[styles.chip, chip.style, (critical || warning) && { opacity: pulse }]}>{chip.text}</Animated.Text> : null}
      <Text style={styles.bac}>Blood alcohol ≈ {night.bacNow.toFixed(3)}%</Text>

      {warning ? (
        <Text style={[styles.rate, { color: colors.warn }]}>
          ⚠ {headingForCritical ? `Heading for critical around ${clock(night.criticalAt!)}.`
            : night.bacNow >= WARNING_BAC ? "You're in the Wasted range."
            : `Heading into the Wasted range around ${clock(night.futurePeakAt)}.`}
          {'  '}<Text style={styles.rateSub}>
            {taking ? `Draining ${rateNum(loss)} HP over the next hour. ` : ''}
            {headingForCritical ? 'Stop drinking now and switch to water.'
              : 'Blackouts, falls and vomiting get likely from here. Switch to water and stay with people you trust.'}
          </Text>
        </Text>
      ) : null}
      {critical ? (
        <Text style={[styles.rate, { color: colors.bad }]}>Health is at 0.  <Text style={styles.rateSub}>Stop drinking and make sure someone sober is with you.</Text></Text>
      ) : stabilising ? (
        <Text style={[styles.rate, { color: colors.gold }]}>Regenerating {rateNum(gain)} HP/hr.  <Text style={styles.rateSub}>Keep someone with you until you're clear, around {clock(night.soberAt)}.</Text></Text>
      ) : taking && !warning ? (
        <Text style={styles.rateSub}>Most of this drain comes in the next hour while your drinks absorb. Lowest point around {clock(night.futurePeakAt)}, even if you stop now.</Text>
      ) : healing ? (
        <Text style={styles.rateSub}>Full health around {clock(night.soberAt)}. Next-day debuffs keep running after that.</Text>
      ) : null}
      {taking && emptyStomachLoss != null && emptyStomachLoss - loss >= 1 ? (
        <Text style={styles.rateNote}>Slowed by food: about {Math.round(emptyStomachLoss)} HP on an empty stomach.</Text>
      ) : null}
      {reduceMotion && direction ? <Text style={styles.motionNote}>Animations are off because Reduce Motion is on in your phone's settings.</Text> : null}

      <Text style={styles.desc}>{PHASE_COPY[k]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ringBox: { alignSelf: 'center' },
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 2 },
  hpNum: { fontFamily: fonts.display, color: colors.ink, includeFontPadding: false },
  hpMax: { fontFamily: fonts.display, color: colors.inkDim },
  zone: { fontFamily: fonts.display, letterSpacing: 0.4 },
  chip: { alignSelf: 'center', fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 0.6, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden', textAlign: 'center' },
  chipDmg: { color: '#fff', backgroundColor: colors.hp },
  chipHeal: { color: colors.edge, backgroundColor: colors.good },
  chipCrit: { color: '#fff', backgroundColor: '#b3132b' },
  chipStab: { color: colors.edge, backgroundColor: colors.gold },
  chipWarn: { color: colors.edge, backgroundColor: '#ff8a3d' },
  bac: { alignSelf: 'center', fontFamily: fonts.body, fontSize: 13, color: colors.inkDim, marginTop: -4 },
  particle: { position: 'absolute', width: 4, height: 4 },
  pop: { position: 'absolute', width: 32, textAlign: 'center', fontFamily: fonts.num, fontSize: 24, textShadowColor: colors.edge, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  rate: { fontFamily: fonts.bodyBold, fontSize: 14 },
  rateSub: { fontFamily: fonts.body, fontSize: 13.5, color: colors.inkDim, lineHeight: 19 },
  rateNote: { fontFamily: fonts.body, fontSize: 13, color: colors.good },
  motionNote: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
  desc: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, lineHeight: 21 },
});
