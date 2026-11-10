import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import {
  FED_WINDOW, PHASES, WARNING_BAC, healthState, hpFromBac, hpGainNextHour, hpLossNextHour, phaseIndex, simulateNight, type Night,
} from '../../../engine/src/index.ts';
import { colors, fonts } from '../theme';
import { HEART } from '../sprites';
import { PixelSprite } from './PixelSprite';
import { PHASE_COPY } from '../copy';
import { clock } from '../format';
import { useReduceMotion } from '../useReduceMotion';

const SEGMENTS = ['WASTED', 'ROUGH', 'DRUNK', 'TIPSY', 'BUZZED', 'FRESH'];
const TICKS = ['.15', '.11', '.08', '.05', '.02'];
/** The native animation driver isn't available on web (used only for browser testing). */
const NATIVE = Platform.OS !== 'web';

/**
 * A striped section of the bar: incoming damage (red/white) or the next hour's healing (green).
 * The stripes stay still; every few seconds a soft shine slides once across, like light catching glass.
 * Damage shines right-to-left (the way health is draining), healing left-to-right.
 */
const SHINE_W = 22;
function Zone({ left, width, kind, label, still }: { left: number; width: number; kind: 'dmg' | 'heal'; label: string; still: boolean }) {
  const id = 'stripes-' + kind;
  const [a, b] = kind === 'dmg' ? ['rgba(255,240,220,0.75)', 'rgba(140,20,40,0.6)'] : ['rgba(95,211,154,0.65)', 'rgba(95,211,154,0.2)'];
  const [zoneW, setZoneW] = useState(0);
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still || zoneW < 8) return;
    sweep.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(1800),
      Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
      Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: NATIVE }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [still, zoneW, sweep]);
  const from = -SHINE_W * 2, to = zoneW + SHINE_W;
  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: kind === 'dmg' ? [to, from] : [from, to] });
  return (
    <View onLayout={e => setZoneW(Math.round(e.nativeEvent.layout.width))}
      style={[styles.zone, { left: `${left}%`, width: `${width}%` }, kind === 'dmg' ? styles.zoneDmg : styles.zoneHeal]}>
      {!still && zoneW >= 8 ? (
        <Animated.View pointerEvents="none" style={[styles.shine, { transform: [{ translateX }, { skewX: '-20deg' }] }]}>
          <View style={styles.shineSoft} /><View style={styles.shineCore} /><View style={styles.shineSoft} />
        </Animated.View>
      ) : null}
      <View style={styles.stripeLayer}>
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id={id} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform={`rotate(${kind === 'dmg' ? -45 : 45})`}>
              <Rect width={4} height={8} fill={a} />
              <Rect x={4} width={4} height={8} fill={b} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
      {label ? <Text style={[styles.zoneTxt, { textShadowColor: kind === 'dmg' ? '#3a0a14' : '#0d3a26' }]}>{label}</Text> : null}
    </View>
  );
}

type PopKind = 'dmg' | 'heal' | 'spark' | 'ember';

/** Floating numbers drift up; sparkles rise; embers fall. Each fades out. */
function Pop({ text, kind, left }: { text: string; kind: PopKind; left: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: kind === 'ember' ? 900 : 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); }, [v, kind]);
  const travel = kind === 'ember' ? 26 : kind === 'spark' ? -30 : -34;
  const style = {
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [kind === 'ember' ? 0 : 8, travel] }) }],
  };
  if (kind === 'spark') return <Animated.View style={[styles.spark, { left: `${left}%` }, style]} />;
  if (kind === 'ember') return <Animated.View style={[styles.ember, { left: `${left}%` }, style]} />;
  return <Animated.Text style={[styles.pop, { left: `${left}%`, color: kind === 'dmg' ? '#ff6a6f' : '#6fe3a8' }, style]}>{text}</Animated.Text>;
}

type PopItem = { id: number; text: string; kind: PopKind; left: number };

export function HealthBar({ night }: { night: Night }) {
  const reduceMotion = useReduceMotion();
  const state = healthState(night);
  const hp = hpFromBac(night.bacNow);
  const incoming = hp - hpFromBac(night.futurePeak);
  const critical = state === 'critical', stabilising = state === 'stabilising', warning = state === 'warning';
  const taking = !critical && !stabilising && incoming > 0.5;
  const healing = !critical && !stabilising && !taking && night.bacNow > 0;
  const loss = hpLossNextHour(night), gain = hpGainNextHour(night);
  // Which way the bar is moving drives the constant animations.
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
  const phaseColor = critical || k >= 5 ? colors.bad : k >= 3 ? colors.warn : colors.ink;
  const hasDrinks = night.drinks.length > 0;

  // ----- Animations -----
  const trail = useRef(new Animated.Value(hp)).current;
  const trailVal = useRef(hp);
  const [pops, setPops] = useState<PopItem[]>([]);
  const popId = useRef(0), prevHp = useRef<number | null>(null), acc = useRef(0);
  const heartX = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const edgeGlow = useRef(new Animated.Value(0.4)).current;
  const hpRef = useRef(hp);
  hpRef.current = hp;

  const addPop = (p: Omit<PopItem, 'id'>) => {
    const id = popId.current++;
    setPops(list => [...list.slice(-24), { ...p, id }]);
    setTimeout(() => setPops(list => list.filter(x => x.id !== id)), 1300);
  };
  const edgeLeft = () => Math.max(2, Math.min(98, hpRef.current));

  // Floating numbers and the trailing bar, whenever health actually changes.
  useEffect(() => {
    const prev = prevHp.current;
    prevHp.current = hp;
    if (prev == null || Math.abs(hp - prev) > 25) { trail.setValue(hp); trailVal.current = hp; acc.current = 0; return; }
    const d = hp - prev;
    if (d < 0) {
      if (trailVal.current < prev) trailVal.current = prev;
      const timer = setTimeout(() => {
        trailVal.current = hp;
        Animated.timing(trail, { toValue: hp, duration: reduceMotion ? 0 : 600, useNativeDriver: false }).start();
      }, 900);
      acc.current = Math.min(0, acc.current) + d;
      if (acc.current <= -1 && !reduceMotion) {
        const n = Math.round(-acc.current); acc.current += n;
        addPop({ text: `−${n}`, kind: 'dmg', left: edgeLeft() });
      }
      return () => clearTimeout(timer);
    }
    if (d > 0) {
      trail.setValue(hp); trailVal.current = hp;
      acc.current = Math.max(0, acc.current) + d;
      if (acc.current >= 1 && !reduceMotion) {
        const n = Math.round(acc.current); acc.current -= n;
        addPop({ text: `+${n}`, kind: 'heal', left: edgeLeft() });
      }
    }
  }, [hp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Constant motion while the bar is moving: embers fall when going down, sparkles rise when going up.
  useEffect(() => {
    if (!direction || reduceMotion) return;
    const id = setInterval(() => addPop({ text: '', kind: direction === 'down' ? 'ember' : 'spark', left: edgeLeft() + (Math.random() * 3 - 1.5) }), 450);
    return () => clearInterval(id);
  }, [direction, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Heart: a flinch every couple of seconds while taking damage, a steady heartbeat while healing.
  useEffect(() => {
    heartScale.setValue(1); heartX.setValue(0);
    if (!direction || reduceMotion) return;
    const anim = direction === 'up'
      ? Animated.loop(Animated.sequence([
          Animated.timing(heartScale, { toValue: 1.2, duration: 160, useNativeDriver: true }),
          Animated.timing(heartScale, { toValue: 1.04, duration: 140, useNativeDriver: true }),
          Animated.timing(heartScale, { toValue: 1.15, duration: 140, useNativeDriver: true }),
          Animated.timing(heartScale, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(700),
        ]))
      : Animated.loop(Animated.sequence([
          ...[-4, 4, -3, 2, 0].map(x => Animated.timing(heartX, { toValue: x, duration: 60, useNativeDriver: true })),
          Animated.delay(1900),
        ]));
    anim.start();
    return () => anim.stop();
  }, [direction, reduceMotion, heartScale, heartX]);

  // A glow at the edge of the bar that breathes: white-hot while dropping, green while healing.
  useEffect(() => {
    if (!direction || reduceMotion) { edgeGlow.setValue(direction ? 1 : 0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(edgeGlow, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(edgeGlow, { toValue: 0.35, duration: 500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [direction, reduceMotion, edgeGlow]);

  // Pulsing chip and bar when critical or warning (warning pulses more slowly).
  useEffect(() => {
    if ((!critical && !warning) || reduceMotion) { pulse.setValue(1); return; }
    const ms = critical ? 550 : 900;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.45, duration: ms, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: ms, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [critical, warning, reduceMotion, pulse]);

  const chip = critical ? { text: 'CRITICAL', style: styles.chipCrit } : stabilising ? { text: 'STABILISING', style: styles.chipStab }
    : warning ? { text: 'WARNING', style: styles.chipWarn }
    : taking ? { text: 'TAKING DAMAGE', style: styles.chipDmg } : healing ? { text: 'REGENERATING', style: styles.chipHeal } : null;
  const gainText = gain >= 1 ? Math.round(gain) : gain.toFixed(1);

  return (
    <View>
      <View style={styles.head}>
        <Animated.View style={{ transform: [{ translateX: heartX }, { scale: heartScale }] }}>
          <PixelSprite sprite={HEART} scale={4} dim={critical} />
        </Animated.View>
        <Text style={[styles.phase, { color: phaseColor }]}>{critical ? 'Critical' : PHASES[k].name}</Text>
        {chip ? <Animated.Text style={[styles.chip, chip.style, (critical || warning) && { opacity: pulse }]}>{chip.text}</Animated.Text> : null}
        <View style={styles.meta}>
          <Text style={styles.hpNum}>HP {Math.round(hp)}</Text>
          <Text style={styles.bac}>Blood alcohol ≈ {night.bacNow.toFixed(3)}%</Text>
        </View>
      </View>

      <View style={styles.tickRow}>
        {TICKS.map((t, i) => <Text key={t} style={[styles.tick, { left: `${((i + 1) * 100) / 6}%` }]}>{t}</Text>)}
      </View>

      <View>
        <View style={[styles.bar, critical && styles.barCrit, warning && styles.barWarn]} accessibilityRole="progressbar" accessibilityLabel={`Health ${Math.round(hp)} of 100${chip ? ', ' + chip.text.toLowerCase() : ''}`}>
          <Animated.View style={[styles.trail, { width: trail.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }]} />
          <View style={[styles.fill, { width: `${hp}%` }]}>
            <View style={[styles.band, { flex: 22, backgroundColor: colors.hpHi }]} />
            <View style={[styles.band, { flex: 50, backgroundColor: colors.hp }]} />
            <View style={[styles.band, { flex: 28, backgroundColor: colors.hpLo }]} />
          </View>
          {taking ? <Zone kind="dmg" still={reduceMotion} left={hp - incoming} width={incoming} label={incoming >= 13 ? `−${Math.round(incoming)} HP incoming` : incoming >= 6 ? `−${Math.round(incoming)}` : ''} /> : null}
          {(healing || stabilising) && gain > 0.3 ? <Zone kind="heal" still={reduceMotion} left={hp} width={gain} label={gain >= 13 ? `+${Math.round(gain)} HP next hour` : gain >= 6 ? `+${Math.round(gain)}` : ''} /> : null}
          {[1, 2, 3, 4, 5].map(i => <View key={i} style={[styles.divider, { left: `${(i * 100) / 6}%` }]} />)}
          {direction ? <Animated.View pointerEvents="none" style={[styles.edge, { left: `${hp}%`, opacity: edgeGlow, backgroundColor: direction === 'down' ? '#ffffff' : colors.good }]} /> : null}
          {critical || warning ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, critical ? styles.critGlow : styles.warnGlow, { opacity: pulse }]} /> : null}
        </View>
        <View style={styles.popLayer} pointerEvents="none">
          {pops.map(p => <Pop key={p.id} {...p} />)}
        </View>
      </View>

      {warning ? (
        <Text style={[styles.rate, { color: colors.warn }]}>
          ⚠ {headingForCritical ? `Heading for critical around ${clock(night.criticalAt!)}.`
            : night.bacNow >= WARNING_BAC ? "You're in the Wasted range."
            : `Heading into the Wasted range around ${clock(night.futurePeakAt)}.`}
          {'  '}<Text style={styles.rateSub}>{headingForCritical ? 'Stop drinking now and switch to water.'
            : 'Blackouts, falls and vomiting get likely from here. Switch to water and stay with people you trust.'}</Text>
        </Text>
      ) : null}
      {critical ? (
        <Text style={[styles.rate, { color: colors.bad }]}>Health is at 0.  <Text style={styles.rateSub}>Stop drinking and make sure someone sober is with you.</Text></Text>
      ) : stabilising ? (
        <Text style={[styles.rate, { color: colors.warn }]}>Stabilising · +{gainText} HP/hr  <Text style={styles.rateSub}>Keep someone with you until you're clear, around {clock(night.soberAt)}.</Text></Text>
      ) : taking ? (
        <View style={{ gap: 2 }}>
          <Text style={[styles.rate, { color: colors.bad }]}>▼ −{Math.max(1, Math.round(loss))} HP next hour  <Text style={styles.rateSub}>Peak around {clock(night.futurePeakAt)}, even if you stop now.</Text></Text>
          {emptyStomachLoss != null && emptyStomachLoss - loss >= 1 ? (
            <Text style={styles.rateNote}>Slowed by food: about −{Math.round(emptyStomachLoss)} on an empty stomach.</Text>
          ) : null}
        </View>
      ) : healing ? (
        <Text style={[styles.rate, { color: colors.good }]}>▲ +{gainText} HP/hr  <Text style={styles.rateSub}>Full health around {clock(night.soberAt)}. Next-day debuffs keep running after that.</Text></Text>
      ) : null}
      {reduceMotion && direction ? <Text style={styles.motionNote}>Animations are off because Reduce Motion is on in your phone's settings.</Text> : null}

      <View style={styles.segRow}>
        {SEGMENTS.map((s, i) => {
          const on = hasDrinks && 5 - i === Math.min(k, 5);
          return <Text key={s} style={[styles.seg, on && styles.segOn]}>{s}</Text>;
        })}
      </View>
      <Text style={styles.desc}>{PHASE_COPY[k]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  phase: { fontFamily: fonts.displayBold, fontSize: 30 },
  chip: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 0.5, paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden' },
  chipDmg: { color: '#fff', backgroundColor: colors.hp },
  chipHeal: { color: colors.edge, backgroundColor: colors.good },
  chipCrit: { color: '#fff', backgroundColor: '#b3132b' },
  chipStab: { color: colors.edge, backgroundColor: colors.warn },
  chipWarn: { color: colors.edge, backgroundColor: '#ff8a3d' },
  meta: { marginLeft: 'auto', alignItems: 'flex-end' },
  hpNum: { fontFamily: fonts.num, fontSize: 26, color: colors.ink, lineHeight: 26 },
  bac: { fontFamily: fonts.body, fontSize: 13, color: colors.inkDim },
  tickRow: { height: 16, marginHorizontal: 3 },
  tick: { position: 'absolute', transform: [{ translateX: -9 }], fontFamily: fonts.bodyBold, fontSize: 11, color: colors.inkFaint },
  bar: { height: 30, marginHorizontal: 3, backgroundColor: colors.hpEmpty, borderWidth: 3, borderColor: colors.edge, overflow: 'hidden' },
  barCrit: { borderColor: '#b3132b' },
  barWarn: { borderColor: '#ff8a3d' },
  critGlow: { backgroundColor: 'rgba(255,60,80,0.25)' },
  warnGlow: { backgroundColor: 'rgba(255,138,61,0.14)' },
  trail: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#ffe08a' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  band: { width: '100%' },
  zone: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  zoneDmg: { borderLeftWidth: 2, borderLeftColor: '#fff4e6' },
  zoneHeal: { borderRightWidth: 2, borderRightColor: colors.good },
  stripeLayer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  shine: { position: 'absolute', top: -4, bottom: -4, left: 0, width: SHINE_W, flexDirection: 'row', zIndex: 1 },
  shineSoft: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  shineCore: { flex: 1, backgroundColor: 'rgba(255,255,255,0.42)' },
  zoneTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#fff', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
  divider: { position: 'absolute', top: 0, bottom: 0, width: 3, marginLeft: -3, backgroundColor: colors.edge },
  edge: { position: 'absolute', top: 0, bottom: 0, width: 4, marginLeft: -2 },
  popLayer: { position: 'absolute', left: 3, right: 3, top: 0, bottom: 0 },
  pop: { position: 'absolute', top: -6, marginLeft: -14, width: 28, textAlign: 'center', fontFamily: fonts.num, fontSize: 26, textShadowColor: colors.edge, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  spark: { position: 'absolute', top: 10, width: 4, height: 4, marginLeft: -2, backgroundColor: '#7ff0b8' },
  ember: { position: 'absolute', top: 20, width: 4, height: 4, marginLeft: -2, backgroundColor: '#ff6a6f' },
  rate: { fontFamily: fonts.bodyBold, fontSize: 14, marginTop: 9, marginHorizontal: 3 },
  rateSub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkDim },
  rateNote: { fontFamily: fonts.body, fontSize: 13, color: colors.good, marginHorizontal: 3 },
  motionNote: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, marginTop: 4, marginHorizontal: 3 },
  segRow: { flexDirection: 'row', marginTop: 8, marginHorizontal: 3 },
  seg: { flex: 1, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 10, color: colors.inkFaint, paddingVertical: 3 },
  segOn: { color: colors.edge, backgroundColor: colors.gold },
  desc: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, marginTop: 12, lineHeight: 21 },
});
