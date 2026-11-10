import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { HOUR, PHASES, hpFromBac, phaseIndex, type Night } from '../../../engine/src/index.ts';
import { colors, fonts } from '../theme';
import { HEART } from '../sprites';
import { PixelSprite } from './PixelSprite';
import { PHASE_COPY } from '../copy';
import { clock } from '../format';

const SEGMENTS = ['WASTED', 'ROUGH', 'DRUNK', 'TIPSY', 'BUZZED', 'FRESH'];
const TICKS = ['.15', '.11', '.08', '.05', '.02'];

/** A striped section of the bar: incoming damage (red/white) or the next hour's healing (green). */
function Zone({ left, width, kind, label }: { left: number; width: number; kind: 'dmg' | 'heal'; label: string }) {
  const id = 'stripes-' + kind;
  const [a, b] = kind === 'dmg' ? ['rgba(255,240,220,0.75)', 'rgba(140,20,40,0.6)'] : ['rgba(95,211,154,0.65)', 'rgba(95,211,154,0.2)'];
  return (
    <View style={[styles.zone, { left: `${left}%`, width: `${width}%` }, kind === 'dmg' ? styles.zoneDmg : styles.zoneHeal]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform={`rotate(${kind === 'dmg' ? -45 : 45})`}>
            <Rect width={4} height={8} fill={a} />
            <Rect x={4} width={4} height={8} fill={b} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {label ? <Text style={[styles.zoneTxt, { textShadowColor: kind === 'dmg' ? '#3a0a14' : '#0d3a26' }]}>{label}</Text> : null}
    </View>
  );
}

export function HealthBar({ night }: { night: Night }) {
  const hp = hpFromBac(night.bacNow);
  const incoming = hp - hpFromBac(night.futurePeak);
  const taking = incoming > 0.5;
  const healing = !taking && night.bacNow > 0;
  const gain = healing ? Math.max(0, hpFromBac(night.bacAt(night.now + HOUR)) - hp) : 0;
  const k = night.bacNow >= 0.25 ? 6 : phaseIndex(night.bacNow);
  const phaseColor = k >= 5 ? colors.bad : k >= 3 ? colors.warn : colors.ink;
  const hasDrinks = night.drinks.length > 0;

  return (
    <View>
      <View style={styles.head}>
        <PixelSprite sprite={HEART} scale={4} />
        <Text style={[styles.phase, { color: phaseColor }]}>{PHASES[k].name}</Text>
        {taking || healing ? (
          <Text style={[styles.chip, taking ? styles.chipDmg : styles.chipHeal]}>{taking ? 'TAKING DAMAGE' : 'REGENERATING'}</Text>
        ) : null}
        <View style={styles.meta}>
          <Text style={styles.hpNum}>HP {Math.round(hp)}</Text>
          <Text style={styles.bac}>Blood alcohol ≈ {night.bacNow.toFixed(3)}%</Text>
        </View>
      </View>

      <View style={styles.tickRow}>
        {TICKS.map((t, i) => (
          <Text key={t} style={[styles.tick, { left: `${((i + 1) * 100) / 6}%` }]}>{t}</Text>
        ))}
      </View>

      <View style={styles.bar} accessibilityRole="progressbar" accessibilityLabel={`Health ${Math.round(hp)} of 100`}>
        <View style={[styles.fill, { width: `${hp}%` }]}>
          <View style={[styles.band, { flex: 22, backgroundColor: colors.hpHi }]} />
          <View style={[styles.band, { flex: 50, backgroundColor: colors.hp }]} />
          <View style={[styles.band, { flex: 28, backgroundColor: colors.hpLo }]} />
        </View>
        {taking ? <Zone kind="dmg" left={hp - incoming} width={incoming} label={incoming >= 13 ? `−${Math.round(incoming)} HP incoming` : incoming >= 6 ? `−${Math.round(incoming)}` : ''} /> : null}
        {healing && gain > 0.3 ? <Zone kind="heal" left={hp} width={gain} label={gain >= 13 ? `+${Math.round(gain)} HP next hour` : gain >= 6 ? `+${Math.round(gain)}` : ''} /> : null}
        {[1, 2, 3, 4, 5].map(i => <View key={i} style={[styles.divider, { left: `${(i * 100) / 6}%` }]} />)}
      </View>

      {taking ? (
        <Text style={[styles.rate, { color: colors.bad }]}>▼ −{Math.round(incoming)} HP still to land  <Text style={styles.rateSub}>Peak around {clock(night.futurePeakAt)}, even if you stop now.</Text></Text>
      ) : healing ? (
        <Text style={[styles.rate, { color: colors.good }]}>▲ +{gain >= 1 ? Math.round(gain) : gain.toFixed(1)} HP/hr  <Text style={styles.rateSub}>Full health around {clock(night.soberAt)}. Next-day debuffs keep running after that.</Text></Text>
      ) : null}

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
  meta: { marginLeft: 'auto', alignItems: 'flex-end' },
  hpNum: { fontFamily: fonts.num, fontSize: 26, color: colors.ink, lineHeight: 26 },
  bac: { fontFamily: fonts.body, fontSize: 13, color: colors.inkDim },
  tickRow: { height: 16, marginHorizontal: 3 },
  tick: { position: 'absolute', transform: [{ translateX: -9 }], fontFamily: fonts.bodyBold, fontSize: 11, color: colors.inkFaint },
  bar: { height: 30, marginHorizontal: 3, backgroundColor: colors.hpEmpty, borderWidth: 3, borderColor: colors.edge, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  band: { width: '100%' },
  zone: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  zoneDmg: { borderLeftWidth: 2, borderLeftColor: '#fff4e6' },
  zoneHeal: { borderRightWidth: 2, borderRightColor: colors.good },
  zoneTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#fff', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
  divider: { position: 'absolute', top: 0, bottom: 0, width: 3, marginLeft: -3, backgroundColor: colors.edge },
  rate: { fontFamily: fonts.bodyBold, fontSize: 14, marginTop: 9, marginHorizontal: 3 },
  rateSub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkDim },
  segRow: { flexDirection: 'row', marginTop: 8, marginHorizontal: 3 },
  seg: { flex: 1, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 10, color: colors.inkFaint, paddingVertical: 3 },
  segOn: { color: colors.edge, backgroundColor: colors.gold },
  desc: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, marginTop: 12, lineHeight: 21 },
});
