// The status tray: buffs and debuffs as a row of RPG-style icons under the HP ring.
// Frame colour = severity (yellow, orange, red; purple when unrated; green for buffs), pips repeat it,
// a shaded wedge shows time already used (sweeping clockwise like the ring), and tapping opens the details.
// Debuffs still running from an earlier night sit in their own "Lingering" row; one that tonight causes again
// stacks (a ×2 badge) with tonight's.
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAnimatedValue } from '../useAnimatedValue';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { keyToTime, nightOf, type Effect, type Night, type RegionCode } from '../../../engine/src/index.ts';
import { useColors, makeStyles, type Palette, fonts } from '../theme';
import { ICONS } from '../sprites';
import { PixelSprite } from './PixelSprite';
import { EFFECT_NAMES, describe, severityLabel } from '../copy';
import { clock, duration } from '../format';
import { useReduceMotion } from '../useReduceMotion';

const NATIVE = Platform.OS !== 'web';
const SLOT = 50;

function frameColor(e: Effect, colors: Palette): string {
  if (e.kind === 'buff') return colors.buff;
  return e.severity == null ? colors.sevUnrated : [colors.sevMinor, colors.sevModerate, colors.sevSevere][e.severity];
}

/** Worst first: active debuffs by severity then time left, then incoming debuffs, then buffs. */
function order(list: Effect[], now: number): Effect[] {
  const left = (e: Effect) => e.end - now;
  const rank = (e: Effect) => (e.status === 'incoming' ? 10 : 0) + (2 - (e.severity ?? -1));
  return [...list].sort((a, b) => rank(a) - rank(b) || left(b) - left(a));
}

/** "25m", "7h" — short enough to sit under a 50px icon. */
function short(ms: number): string {
  const m = ms / 60000;
  return m < 60 ? `${Math.max(1, Math.round(m))}m` : `${Math.floor(m / 60)}h`;
}

/** When something ends: a time today, or the day and time if it's further off. */
function endsAt(t: number, now: number): string {
  return t - now < 20 * 3600_000 ? clock(t) : `${new Date(t).toLocaleDateString([], { weekday: 'short' })} ${clock(t)}`;
}

/** "Friday night" for the night a first drink belongs to (drinks after midnight count as the evening before). */
function nightName(firstDrink: number): string {
  return `${new Date(keyToTime(nightOf(firstDrink))).toLocaleDateString([], { weekday: 'long' })} night`;
}

/** The time already used, as a shaded pie wedge from 12 o'clock, clockwise. */
function Wedge({ used }: { used: number }) {
  const colors = useColors();
  if (used <= 0.01) return null;
  const c = SLOT / 2, r = SLOT;
  let d: string;
  if (used >= 0.999) d = `M 0 0 H ${SLOT} V ${SLOT} H 0 Z`;
  else {
    const a = used * 2 * Math.PI;
    d = `M ${c} ${c} L ${c} ${c - r} A ${r} ${r} 0 ${used > 0.5 ? 1 : 0} 1 ${c + r * Math.sin(a)} ${c - r * Math.cos(a)} Z`;
  }
  return (
    <Svg width={SLOT - 6} height={SLOT - 6} viewBox={`3 3 ${SLOT - 6} ${SLOT - 6}`} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={d} fill={colors.wedge} />
    </Svg>
  );
}

function Slot({ e, now, land, onPress }: { e: Effect; now: number; land: boolean; onPress: () => void }) {
  const colors = useColors();
  const styles = useStyles(colors);
  const reduceMotion = useReduceMotion();
  const pop = useAnimatedValue(land && !reduceMotion ? 0 : 1);
  useEffect(() => {
    if (!land || reduceMotion) return;
    Animated.timing(pop, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(2.2)), useNativeDriver: NATIVE }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const incoming = e.status === 'incoming', ongoing = e.status === 'ongoing' || !isFinite(e.end);
  const left = e.end - now;
  const used = incoming || ongoing ? 0 : Math.min(1, Math.max(0, (now - e.start) / Math.max(1, e.end - e.start)));
  const color = frameColor(e, colors);
  const time = incoming ? `in ${short(e.start - now)}` : ongoing ? 'Active' : short(left);
  const name = EFFECT_NAMES[e.id];
  const label = `${name}${(e.stacks ?? 1) > 1 ? `, stacked ×${e.stacks}` : ''}, ${incoming ? 'starts in ' + duration(e.start - now) : ongoing ? 'active' : duration(left) + ' left'}, ${severityLabel(e).toLowerCase()}. Show details`;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.slot} hitSlop={3}>
      <Animated.View style={[
        styles.icon, { borderColor: color }, e.kind === 'buff' && styles.buffIcon, incoming && styles.incomingIcon,
        { opacity: pop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }), transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] },
      ]}>
        <View style={incoming && { opacity: 0.45 }}>
          <PixelSprite sprite={ICONS[e.id]} scale={2} />
        </View>
        <Wedge used={used} />
        {e.kind === 'debuff' && e.severity != null ? (
          <View style={styles.pips}>
            {Array.from({ length: e.severity + 1 }, (_, i) => <View key={i} style={[styles.pip, { backgroundColor: color }]} />)}
          </View>
        ) : null}
        {incoming ? <Text style={styles.badge}>⏱</Text> : null}
        {(e.stacks ?? 1) > 1 ? <View style={styles.stack}><Text style={styles.stackTxt}>×{e.stacks}</Text></View> : null}
      </Animated.View>
      <Text style={[styles.time, incoming && styles.timeIncoming, !incoming && !ongoing && left < 3600_000 && styles.timeSoon]}>{time}</Text>
    </Pressable>
  );
}

export function StatusTray({ debuffs, buffs, lingering = [], sources, night, region }: {
  debuffs: Effect[]; buffs: Effect[]; night: Night; region: RegionCode;
  /** Debuffs still running from earlier nights (not caused again tonight). */
  lingering?: Effect[];
  /** Earlier nights' simulations by first drink, so their descriptions use their own numbers. */
  sources?: Map<number, Night>;
}) {
  const colors = useColors();
  const styles = useStyles(colors);
  const now = night.now;
  const tonight = [...order(debuffs, now), ...order(buffs, now)];
  const carried = order(lingering, now);
  const list = [...tonight, ...carried];
  const fromNames = [...new Set(carried.map(e => nightName(e.carriedFrom!)))];
  const lingerTitle = fromNames.length === 1 ? `Lingering from ${fromNames[0]}` : 'Lingering from recent nights';
  const [openId, setOpenId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Effects that start after the tray first appeared (and have started) land with a pop;
  // the ones already there when you open the app don't.
  const [shownSince] = useState(now);
  const fresh = new Set(list.filter(e => e.start > shownSince && e.start <= now).map(e => e.id));

  const openIdx = list.findIndex(e => e.id === openId);
  const open = openIdx >= 0 ? list[openIdx] : null;
  const step = (d: number) => setOpenId(list[(openIdx + d + list.length) % list.length].id);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Status</Text>
      {tonight.length ? (
        <View style={styles.tray}>
          {tonight.map((e, i) => (
            <View key={e.id} style={styles.slotWrap}>
              {e.kind === 'buff' && i > 0 && tonight[i - 1].kind === 'debuff' ? <View style={styles.sep} /> : null}
              <Slot e={e} now={now} land={fresh.has(e.id)} onPress={() => setOpenId(e.id)} />
            </View>
          ))}
        </View>
      ) : <Text style={styles.empty}>{carried.length ? 'Nothing new tonight.' : 'No buffs or debuffs. Log a drink and they show up here.'}</Text>}
      {debuffs.length && !buffs.length ? <Text style={styles.empty}>No buffs. Water, food and a slower pace earn them.</Text> : null}
      {carried.length ? (
        <View style={styles.linger}>
          <Text style={styles.lingerTitle}>{lingerTitle.toUpperCase()}</Text>
          <View style={styles.tray}>
            {carried.map(e => <Slot key={e.id} e={e} now={now} land={false} onPress={() => setOpenId(e.id)} />)}
          </View>
        </View>
      ) : null}

      <Modal visible={!!open} transparent animationType="slide" onRequestClose={() => setOpenId(null)}>
        <Pressable style={styles.backdrop} onPress={() => setOpenId(null)} accessibilityLabel="Close details" />
        {open ? (
          <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
            <ScrollView contentContainerStyle={{ gap: 10 }}>
              <View style={styles.sheetTop}>
                <View style={[styles.bigIcon, { borderColor: frameColor(open, colors) }]}>
                  <PixelSprite sprite={ICONS[open.id]} scale={3} dim={open.status === 'incoming'} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.sheetName}>{EFFECT_NAMES[open.id]}</Text>
                  <Text style={[styles.sev, { color: frameColor(open, colors) }]}>{severityLabel(open)}</Text>
                </View>
                <Pressable onPress={() => setOpenId(null)} style={styles.x} accessibilityRole="button" accessibilityLabel="Close details">
                  <Text style={styles.xTxt}>×</Text>
                </Pressable>
              </View>
              <Text style={styles.when}>
                {open.status === 'incoming' ? `Starts in ${duration(open.start - now)}, around ${clock(open.start)}`
                  : open.status === 'ongoing' || !isFinite(open.end) ? 'Active now'
                  : `${duration(open.end - now)} left · ends around ${endsAt(open.end, now)}`}
              </Text>
              <View style={styles.bar}>
                <View style={[styles.barFill, {
                  backgroundColor: frameColor(open, colors),
                  width: open.status !== 'active' || !isFinite(open.end) ? '100%' : `${Math.max(3, ((open.end - now) / Math.max(1, open.end - open.start)) * 100)}%`,
                }]} />
              </View>
              {(open.stacks ?? 1) > 1 && open.carriedFrom != null ? (
                <Text style={styles.from}>Stacked ×{open.stacks}. Still running from {nightName(open.carriedFrom)}, and tonight builds on it. It lasts until the later of the two, at the worse severity.</Text>
              ) : open.carriedFrom != null ? (
                <Text style={styles.from}>Lingering from {nightName(open.carriedFrom)}. Drinking again before it wears off stacks on top of it.</Text>
              ) : null}
              <Text style={styles.desc}>{describe(open, open.carriedFrom != null && carried.includes(open) ? sources?.get(open.carriedFrom) ?? night : night, region)}</Text>
              {list.length > 1 ? (
                <View style={styles.nav}>
                  <Pressable onPress={() => step(-1)} style={styles.navBtn} accessibilityRole="button"><Text style={styles.navTxt}>‹ Previous</Text></Pressable>
                  <Pressable onPress={() => step(1)} style={styles.navBtn} accessibilityRole="button"><Text style={styles.navTxt}>Next ›</Text></Pressable>
                </View>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  wrap: { gap: 8 },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 0.4, color: colors.ink },
  tray: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 6 },
  slotWrap: { flexDirection: 'row', gap: 6 },
  sep: { width: 2, height: SLOT, backgroundColor: colors.edgeHi, marginHorizontal: 3 },
  slot: { width: SLOT, alignItems: 'center', gap: 3 },
  icon: {
    width: SLOT, height: SLOT, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sunk,
    borderWidth: 3, overflow: 'hidden',
  },
  buffIcon: { backgroundColor: 'rgba(76,196,136,0.16)' },
  incomingIcon: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  pips: { position: 'absolute', top: 2, right: 2, flexDirection: 'row', gap: 2 },
  pip: { width: 4, height: 4, borderWidth: 1, borderColor: colors.edge },
  badge: { position: 'absolute', left: 1, bottom: 0, fontSize: 10 },
  stack: { position: 'absolute', left: 0, bottom: 0, backgroundColor: colors.edge, paddingHorizontal: 3, paddingTop: 1, borderTopRightRadius: 4 },
  stackTxt: { fontFamily: fonts.num, fontSize: 18, lineHeight: 16, color: colors.gold },
  linger: { gap: 6, marginTop: 4, paddingTop: 8, borderTopWidth: 2, borderColor: colors.edgeHi, borderStyle: 'dashed' },
  lingerTitle: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, color: colors.inkFaint },
  from: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: colors.gold },
  time: { fontFamily: fonts.display, fontSize: 19, lineHeight: 19, color: colors.ink },
  timeIncoming: { color: colors.inkFaint, fontSize: 16 },
  timeSoon: { color: colors.gold },
  empty: { fontFamily: fonts.body, fontSize: 13.5, color: colors.inkFaint },
  backdrop: { flex: 1, backgroundColor: 'rgba(9,7,14,0.7)' },
  sheet: { backgroundColor: colors.panel2, borderTopWidth: 3, borderColor: colors.edgeHi, padding: 16, maxHeight: '80%' },
  sheetTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sunk, borderWidth: 3 },
  sheetName: { fontFamily: fonts.display, fontSize: 32, lineHeight: 32, color: colors.ink },
  sev: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, alignSelf: 'flex-start', backgroundColor: colors.sunk, paddingHorizontal: 6, paddingVertical: 2 },
  x: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi },
  xTxt: { color: colors.ink, fontSize: 20 },
  when: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink },
  bar: { height: 10, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edge },
  barFill: { height: '100%' },
  desc: { fontFamily: fonts.body, fontSize: 15, color: colors.inkDim, lineHeight: 21 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  navBtn: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi },
  navTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
}));
