// One-shot effects around the HP ring when you log something:
// - a drink: a sword or double-headed axe flies a curving path round the ring, glints, winds up and strikes,
//   with a slash trail, a shake, a red flash and the drink's HP cost floating up;
// - water: blue ripples spread from the ring while droplets fountain off it, and "+ Hydrated" floats up;
// - food: a gold shield ring pulses out while crumbs scatter, and "+ Well fed" floats up.
// The damage itself arrives as the drink absorbs (the ring's incoming arc), so the strike shows the cost without
// pretending it lands at once. Nothing plays when Reduce Motion is on.
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { PixelSprite } from './PixelSprite';
import { AXE, SWORD, type SpriteDef } from '../sprites';
import { fonts } from '../theme';
import { useAnimatedValue } from '../useAnimatedValue';
import { useReduceMotion } from '../useReduceMotion';

const NATIVE = Platform.OS !== 'web';

export type FxEvent = { kind: 'hit' | 'water' | 'food'; id: number; loss?: number };

/** The HP ring's size, matching HealthBar. */
export const ringSize = (screenWidth: number) => Math.min(260, screenWidth - 72);

/**
 * Wraps the HP ring. Plays the effect for each new event (keyed by id) on top of it, and shakes it on a hit.
 * Effects are positioned in the prototype's units (a 210 px ring) and scaled to the real ring.
 */
export function ActionFx({ event, children }: { event: FxEvent | null; children: ReactNode }) {
  const { width } = useWindowDimensions();
  const size = ringSize(width);
  const reduceMotion = useReduceMotion();
  const shake = useAnimatedValue(0);
  const playing = event && !reduceMotion;
  const onHit = () => Animated.sequence([-6, 5, -3, 2, 0].map(v => Animated.timing(shake, { toValue: v, duration: 70, useNativeDriver: NATIVE }))).start();
  return (
    <View>
      <Animated.View style={{ transform: [{ translateX: shake }] }}>{children}</Animated.View>
      {playing ? (
        <View pointerEvents="none" style={[styles.layer, { width: size, height: size, marginLeft: -size / 2 }]}>
          {event.kind === 'hit' ? <Strike key={event.id} size={size} loss={event.loss ?? 0} onHit={onHit} />
            : event.kind === 'water' ? <Splash key={event.id} size={size} />
            : <Feast key={event.id} size={size} />}
        </View>
      ) : null}
    </View>
  );
}

// ---------- The strike ----------

// Flight paths in the prototype's units: x, y from the ring's centre, and the weapon's angle. All end at the strike spot.
const PATHS = [
  [[150, -180, -160], [70, -110, -60], [-55, -125, -15], [-100, -25, 50], [-40, -140, 210], [62, -108, 300]],
  [[170, 140, 40], [110, 60, 90], [0, -150, 200], [-110, -60, 250], [-60, 60, 330], [20, -170, 520], [62, -108, 660]],
  [[-170, 120, -40], [-90, -20, 20], [-20, -150, 120], [60, -60, 200], [110, -170, 260], [62, -108, 300]],
  [[0, -260, 180], [-80, -160, 120], [10, -90, 60], [100, -150, 0], [20, -200, -120], [62, -108, -60]],
];
let pathNo = 0;

// Phases in ms: flight, glint, wind-up, strike, follow-through; the timeline runs on so the damage number can float.
const T = { fly: 1150, glint: 260, wind: 140, strike: 170, out: 240 };
const SWING = T.fly + T.glint + T.wind + T.strike + T.out;
const TOTAL = SWING + 900;
const HIT_AT = T.fly + T.glint + T.wind + T.strike * Math.pow(0.55, 1 / 2.2); // when the blade crosses the ring

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where the weapon is at time t (ms): one smooth Catmull-Rom curve for the flight, then the three beats. */
function weaponAt(path: number[][], t: number) {
  const end = path[path.length - 1][2];
  if (t < T.fly) {
    const u = easeInOut(t / T.fly), n = path.length - 1, x = Math.min(n - 1e-6, u * n), i = Math.floor(x), f = x - i;
    const P = (k: number) => path[Math.max(0, Math.min(n, k))];
    const [px, py, pr] = [0, 1, 2].map(j => cr(P(i - 1)[j], P(i)[j], P(i + 1)[j], P(i + 2)[j], f));
    return { x: px, y: py, r: pr, s: 0.7 + 0.35 * Math.sin(Math.PI * u), o: Math.min(1, t / 160), g: 0 };
  }
  if ((t -= T.fly) < T.glint) { const k = t / T.glint; return { x: 62, y: -108 + 4 * Math.sin(k * Math.PI), r: end, s: 1.05, o: 1, g: Math.sin(k * Math.PI) }; }
  if ((t -= T.glint) < T.wind) { const k = 1 - Math.pow(1 - t / T.wind, 2); return { x: lerp(62, 76, k), y: lerp(-108, -118, k), r: lerp(end, end - 16, k), s: 1.08, o: 1, g: 0 }; }
  if ((t -= T.wind) < T.strike) { const k = Math.pow(t / T.strike, 2.2); return { x: lerp(76, -62, k), y: lerp(-118, 62, k), r: lerp(end - 16, end + 140, k), s: 1.06, o: 1, g: 0 }; }
  if ((t -= T.strike) < T.out) { const k = t / T.out; return { x: lerp(-62, -86, k), y: lerp(62, 86, k), r: lerp(end + 140, end + 152, k), s: 1 - 0.1 * k, o: 1 - k, g: 0 }; }
  return { x: -86, y: 86, r: end + 152, s: 0.9, o: 0, g: 0 };
}

/** The sword or axe's whole flight, sampled densely so a single native animation can follow it smoothly. */
function sampleFlight(path: number[][]) {
  const N = 120, input: number[] = [], xs: number[] = [], ys: number[] = [], rs: string[] = [], ss: number[] = [], os: number[] = [], gs: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * TOTAL, w = weaponAt(path, t);
    input.push(t / TOTAL); xs.push(w.x); ys.push(w.y); rs.push(`${w.r}deg`); ss.push(w.s); os.push(w.o); gs.push(w.g);
  }
  return { input, xs, ys, rs, ss, os, gs };
}

function Strike({ size, loss, onHit }: { size: number; loss: number; onHit: () => void }) {
  const k = size / 210;
  const [plan] = useState(() => ({ flight: sampleFlight(PATHS[pathNo++ % PATHS.length]), sprite: Math.random() < 0.5 ? AXE : SWORD }));
  const p = useAnimatedValue(0);
  useEffect(() => {
    const run = Animated.timing(p, { toValue: 1, duration: TOTAL, easing: Easing.linear, useNativeDriver: NATIVE });
    run.start();
    const hit = setTimeout(onHit, HIT_AT);
    return () => { run.stop(); clearTimeout(hit); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const f = plan.flight;
  const map = (out: number[]) => p.interpolate({ inputRange: f.input, outputRange: out });
  const at = (ms: number) => ms / TOTAL;
  const box = Math.round(22 * 4.8 * k);
  const weapon = (sprite: SpriteDef, opacity: Animated.AnimatedInterpolation<number>) => (
    <Animated.View style={[styles.weapon, { width: box, height: box, marginLeft: -box / 2, marginTop: -box / 2, opacity,
      transform: [{ translateX: map(f.xs.map(v => v * k)) }, { translateY: map(f.ys.map(v => v * k)) },
        { rotate: p.interpolate({ inputRange: f.input, outputRange: f.rs }) }, { scale: map(f.ss) }] }]}>
      <PixelSprite sprite={sprite} scale={4.8 * k} />
    </Animated.View>
  );
  const white: SpriteDef = { rows: plan.sprite.rows, palette: Object.fromEntries(Object.keys(plan.sprite.palette).map(c => [c, '#ffffff'])) };
  const glint = p.interpolate({ inputRange: f.input, outputRange: f.gs.map((g, i) => g * f.os[i] * 0.85) });

  return (
    <>
      {/* The slash trail and a red flash as it connects. */}
      <Animated.View style={[styles.streak, { width: 260 * k, marginLeft: -130 * k, opacity: p.interpolate({ inputRange: [0, at(HIT_AT - 40), at(HIT_AT + 60), at(HIT_AT + 450), 1], outputRange: [0, 0, 0.95, 0, 0] }),
        transform: [{ rotate: '45deg' }, { scaleX: p.interpolate({ inputRange: [0, at(HIT_AT - 40), at(HIT_AT + 60), 1], outputRange: [0.01, 0.01, 1, 1.05] }) }] }]} />
      <Animated.View style={[styles.flash, { borderRadius: size / 2, opacity: p.interpolate({ inputRange: [0, at(HIT_AT), at(HIT_AT + 80), at(HIT_AT + 500), 1], outputRange: [0, 0, 0.45, 0, 0] }) }]} />
      {weapon(plan.sprite, map(f.os))}
      {weapon(white, glint)}
      {loss > 0 ? (
        <Animated.Text style={[styles.float, styles.dmg, {
          opacity: p.interpolate({ inputRange: [0, at(HIT_AT), at(HIT_AT + 150), at(HIT_AT + 700), 1], outputRange: [0, 0, 1, 1, 0] }),
          transform: [{ translateY: p.interpolate({ inputRange: [0, at(HIT_AT), at(HIT_AT + 150), 1], outputRange: [10, 10, 0, -50] }) },
            { scale: p.interpolate({ inputRange: [0, at(HIT_AT), at(HIT_AT + 150), at(HIT_AT + 300), 1], outputRange: [0.6, 0.6, 1.15, 1, 1] }) }] }]}>
          −{Math.round(loss)}
        </Animated.Text>
      ) : null}
    </>
  );
}

// ---------- Water and food ----------

type Particle = { x0: number; y0: number; vx: number; vy: number; g: number; size: number; color: string };

/** Particles bursting from the ring, sampled along their arcs (px from the ring's centre, over `secs`). */
function useBurst(make: () => Particle[], secs: number) {
  const [parts] = useState(make);
  const p = useAnimatedValue(0);
  useEffect(() => {
    const run = Animated.timing(p, { toValue: 1, duration: secs * 1000, easing: Easing.linear, useNativeDriver: NATIVE });
    run.start();
    return () => run.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const steps = Array.from({ length: 9 }, (_, i) => i / 8);
  const dots = parts.map((d, i) => (
    <Animated.View key={i} style={[styles.dot, { width: d.size, height: d.size, backgroundColor: d.color,
      opacity: p.interpolate({ inputRange: [0, 0.05, 0.6, 1], outputRange: [0, 1, 1, 0] }),
      transform: [
        { translateX: p.interpolate({ inputRange: steps, outputRange: steps.map(s => d.x0 + d.vx * s * secs) }) },
        { translateY: p.interpolate({ inputRange: steps, outputRange: steps.map(s => d.y0 + d.vy * s * secs + 0.5 * d.g * (s * secs) ** 2) }) },
      ] }]} />
  ));
  return { p, dots };
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function Splash({ size }: { size: number }) {
  const R = size / 2;
  const { p, dots } = useBurst(() => Array.from({ length: 34 }, (_, i) => {
    const fountain = i < 20;
    const a = fountain ? -Math.PI / 2 + (Math.random() - 0.5) * 1.1 : Math.random() * Math.PI * 2;
    const v = fountain ? 260 + Math.random() * 220 : 70 + Math.random() * 90;
    const r0 = fountain ? R * 0.2 : R * 0.95;
    return { x0: Math.cos(a) * r0, y0: Math.sin(a) * r0 - (fountain ? R * 0.55 : 0), vx: Math.cos(a) * v, vy: Math.sin(a) * v - (fountain ? 60 : 40),
      g: fountain ? 900 : 500, size: Math.random() < 0.3 ? 6 : 4, color: pick(['#a9d4ff', '#6fb4ff', '#4a8fd6', '#ffffff']) };
  }), 1.3);
  const ripple = (delay: number) => (
    <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: R, borderColor: '#6fb4ff',
      opacity: p.interpolate({ inputRange: [0, delay, delay + 0.12, Math.min(1, delay + 0.8), 1], outputRange: [0, 0, 0.9, 0, 0] }),
      transform: [{ scale: p.interpolate({ inputRange: [0, delay, Math.min(1, delay + 0.8), 1], outputRange: [0.92, 0.92, 1.3, 1.3] }) }] }]} />
  );
  return (
    <>
      {ripple(0)}{ripple(0.22)}
      {dots}
      <FloatText p={p} text="+ Hydrated" color="#a9d4ff" />
    </>
  );
}

function Feast({ size }: { size: number }) {
  const R = size / 2;
  const { p, dots } = useBurst(() => Array.from({ length: 28 }, () => {
    const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 140;
    return { x0: Math.cos(a) * R * 0.85, y0: Math.sin(a) * R * 0.85, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, g: 700,
      size: Math.random() < 0.35 ? 6 : 4, color: pick(['#f2c14e', '#d99a4e', '#a87a22', '#fff1b0']) };
  }), 1.2);
  return (
    <>
      <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: R, borderColor: '#f2c14e', borderWidth: 6,
        opacity: p.interpolate({ inputRange: [0, 0.18, 0.9, 1], outputRange: [0, 0.9, 0, 0] }),
        transform: [{ scale: p.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.88, 1.02, 1.18] }) }] }]} />
      {dots}
      <FloatText p={p} text="+ Well fed" color="#f2c14e" />
    </>
  );
}

function FloatText({ p, text, color }: { p: Animated.Value; text: string; color: string }) {
  return (
    <Animated.Text style={[styles.float, styles.buffText, { color,
      opacity: p.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
      transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [10, -45] }) }] }]}>
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: '50%', alignItems: 'center', justifyContent: 'center' },
  weapon: { position: 'absolute', left: '50%', top: '50%', alignItems: 'center', justifyContent: 'center' },
  streak: { position: 'absolute', height: 8, top: '50%', left: '50%', marginTop: -4, backgroundColor: '#fff6ee', borderRadius: 4 },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#e5484f' },
  ring: { position: 'absolute', borderWidth: 5 },
  dot: { position: 'absolute', left: '50%', top: '50%' },
  float: { position: 'absolute', top: '24%', alignSelf: 'center', textShadowColor: '#0c0912', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  dmg: { fontFamily: fonts.num, fontSize: 40, color: '#ff6a6f' },
  buffText: { fontFamily: fonts.display, fontSize: 28 },
});

