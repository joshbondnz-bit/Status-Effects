// The Sleep forecast: blood alcohol over the night. Solid so far, dotted for the projection, with zone bands,
// the peak and "clear" moments labelled, what you had along the bottom, drag-to-read, and a "what if one more?" ghost.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { HOUR, MIN, PHASES, THRESHOLDS, makeDrink, simulateNight, type LogEvent, type Night } from '../../../engine/src/index.ts';
import { colors, fonts } from '../theme';
import { clock } from '../format';
import { ICONS, glassSprite } from '../sprites';
import { PixelSprite } from './PixelSprite';

const PAD_L = 28, PAD_R = 50, PAD_T = 22, PLOT_H = 150;
const BASE = PAD_T + PLOT_H;
const LANE_ROW = 20;          // height of one row of icons under the chart
const ICON = 18;              // a 16px sprite with its outline
/** Zone tints, Buzzed → Danger, warming from green to red like the calendar. */
const ZONE_TINT = ['#5fd39a', '#e8c547', '#ff8a3d', '#ff6a4d', '#ec3a50', '#b3132b'];

const pct = (b: number) => `${b.toFixed(3)}%`;

export function CurveChart({ night }: { night: Night }) {
  const [width, setWidth] = useState(0);
  const [scrubT, setScrubT] = useState<number | null>(null);
  const [whatIf, setWhatIf] = useState(false);

  const last = night.drinks[night.drinks.length - 1];
  // The ghost: tonight plus one more of your last drink, right now.
  const ghost = useMemo(() => {
    if (!whatIf || !last) return null;
    const events: LogEvent[] = [...night.drinks, ...night.waters, ...night.foods];
    const spec = { name: last.name, size: last.size, ml: last.ml, abv: last.abv, category: last.category, kcal: last.kcal };
    return simulateNight({ profile: night.profile, events: [...events, makeDrink(spec, night.now, 'what-if')], now: night.now });
  }, [whatIf, last, night]);

  if (!night.drinks.length) return <Text style={styles.empty}>Your forecast appears after the first drink.</Text>;

  // ----- Scales -----
  const W = width || 320;
  const x0 = night.t0;
  const end = (n: Night) => Math.max(n.now + HOUR, n.soberAt + 30 * MIN, Math.min(n.bed, n.now + 10 * HOUR) + 15 * MIN);
  const x1 = Math.max(end(night), ghost ? end(ghost) : 0);
  const yMax = Math.max(0.1, night.peak * 1.2, ghost ? ghost.peak * 1.15 : 0);
  const X = (t: number) => PAD_L + ((t - x0) / (x1 - x0)) * (W - PAD_L - PAD_R);
  const T = (x: number) => x0 + ((x - PAD_L) / (W - PAD_L - PAD_R)) * (x1 - x0);
  const Y = (b: number) => PAD_T + (1 - Math.min(b, yMax) / yMax) * PLOT_H;
  const inPlot = (x: number) => x >= PAD_L - 0.5 && x <= W - PAD_R + 0.5;

  // ----- Curves (every 2 minutes is plenty of detail) -----
  const curve = (n: Night, from: number, to: number) => {
    const pts: string[] = [];
    for (let k = 0; k < n.samples.length; k += 2) {
      const t = n.t0 + k * MIN;
      if (t < from - 2 * MIN) continue;
      if (t > to) break;
      pts.push(`${pts.length ? 'L' : 'M'}${X(t).toFixed(1)},${Y(n.samples[k]).toFixed(1)}`);
    }
    return pts.join('');
  };
  const past = curve(night, x0, night.now);
  const future = curve(night, night.now, x1);
  const area = past ? `${past}L${X(night.now).toFixed(1)},${BASE}L${X(x0).toFixed(1)},${BASE}Z` : '';
  const ghostLine = ghost ? curve(ghost, night.now, x1) : '';

  // ----- Hour labels: every 1, 2 or 4 hours depending on the span -----
  const span = x1 - x0, step = span > 14 * HOUR ? 4 : span > 7 * HOUR ? 2 : 1;
  const hours: number[] = [];
  const h0 = new Date(x0); h0.setMinutes(0, 0, 0);
  for (let t = h0.getTime() + HOUR; t < x1; t += HOUR) if (new Date(t).getHours() % step === 0) hours.push(t);

  // ----- What you had, as icons under the chart; close ones stack into extra rows -----
  const events = [...night.drinks, ...night.waters, ...night.foods].sort((a, b) => a.t - b.t);
  const lastX: number[] = [];
  const placed = events.map(e => {
    const x = X(e.t);
    let row = 0;
    while (lastX[row] != null && x - lastX[row] < ICON + 1) row++;
    lastX[row] = x;
    return { e, x, row };
  }).filter(p => inPlot(p.x));
  const rows = Math.max(1, ...placed.map(p => p.row + 1));
  const laneTop = BASE + 6;
  const hourY = laneTop + rows * LANE_ROW + 12;
  const H = hourY + 6;

  // ----- Labels -----
  const peakFuture = night.peakAt > night.now;
  const peakX = X(night.peakAt), peakY = Y(night.peak);
  const clearX = X(night.soberAt);
  const marker = (t: number, color: string, label: string) => {
    const x = X(t);
    if (!inPlot(x)) return null;
    return [
      <Line key={label + 'l'} x1={x} x2={x} y1={PAD_T - 6} y2={BASE} stroke={color} strokeWidth={2} />,
      <SvgText key={label + 't'} x={Math.min(x + 3, W - PAD_R - 24)} y={PAD_T - 9} fontSize={10} fontFamily={fonts.bodyBold} fill={color}>{label}</SvgText>,
    ];
  };

  // ----- Verdicts -----
  const atBed = night.bedBac > 0.005;
  const verdict = atBed
    ? `About ${pct(night.bedBac)} still in your system at your ${clock(night.bed)} bedtime. Not clear until around ${clock(night.soberAt)}.`
    : `Clear by about ${clock(night.soberAt)}, before your ${clock(night.bed)} bedtime. Your sleep is spared the worst of it.`;
  const ghostVerdict = ghost
    ? `One more ${last.name.toLowerCase()} would leave ${pct(ghost.bedBac)} at bedtime and push "clear" to around ${clock(ghost.soberAt)}${ghost.peak >= 0.08 && night.peak < 0.08 ? ', over the 0.08% limit' : ''}.`
    : '';

  // ----- Drag to read -----
  const scrub = (x: number) => setScrubT(Math.min(x1, Math.max(x0, T(x))));
  const sx = scrubT != null ? X(scrubT) : 0;
  const sBac = scrubT != null ? night.bacAt(scrubT) : 0;
  const sGhost = scrubT != null && ghost && scrubT > night.now ? ghost.bacAt(scrubT) : null;
  const sZone = PHASES[Math.min(6, THRESHOLDS.filter(th => sBac >= th).length - 1)]?.name ?? 'Fresh';
  const tag = scrubT != null ? `${clock(scrubT)} · ${pct(sBac)} ${sBac >= 0.25 ? 'Danger' : sZone}${sGhost != null ? `  (one more: ${pct(sGhost)})` : ''}` : '';
  const tagW = Math.min(W - PAD_L - PAD_R, tag.length * 5.6 + 12);
  const tagX = Math.max(PAD_L, Math.min(W - PAD_R - tagW, sx - tagW / 2));

  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.verdict, { color: atBed ? colors.warn : colors.good }]}>{verdict}</Text>
      {ghost ? <Text style={[styles.verdict, { color: colors.mana }]}>{ghostVerdict}</Text> : null}

      <View onLayout={e => setWidth(Math.round(e.nativeEvent.layout.width))}
        accessible accessibilityLabel={`Sleep forecast. Peak ${pct(night.peak)} around ${clock(night.peakAt)}. ${verdict}`}>
        {width > 0 ? (
          <View style={{ width: W, height: H }}>
            <Svg width={W} height={H}>
              {/* Zone bands, with names on the right edge */}
              {THRESHOLDS.slice(1, -1).map((lo, i) => {
                const hi = THRESHOLDS[i + 2];
                if (lo >= yMax) return null;
                const yTop = Y(hi), yBot = Y(lo);
                return [
                  <Rect key={'z' + i} x={PAD_L} y={yTop} width={W - PAD_L - PAD_R} height={yBot - yTop} fill={ZONE_TINT[i]} opacity={0.1} />,
                  yBot - yTop >= 11 ? <SvgText key={'zn' + i} x={W - PAD_R + 5} y={(yTop + yBot) / 2 + 3.5} fontSize={10} fontFamily={fonts.bodyBold} fill={ZONE_TINT[i]}>{PHASES[i + 1].name}</SvgText> : null,
                ];
              })}
              {THRESHOLDS.slice(1).filter(th => th <= yMax).map(th => [
                <Line key={'th' + th} x1={PAD_L} x2={W - PAD_R} y1={Y(th)} y2={Y(th)} stroke={colors.edgeHi} strokeWidth={1} strokeDasharray="3 4" />,
                <SvgText key={'tl' + th} x={2} y={Y(th) + 3.5} fontSize={10} fontFamily={fonts.bodyBold} fill={colors.inkFaint}>{th.toFixed(2).slice(1)}</SvgText>,
              ])}
              <Line x1={PAD_L} x2={W - PAD_R} y1={BASE} y2={BASE} stroke={colors.edgeHi} strokeWidth={1} />

              {/* The curve: area and line so far, dotted projection, and the what-if ghost */}
              {area ? <Path d={area} fill={colors.hp} opacity={0.22} /> : null}
              {ghostLine ? <Path d={ghostLine} stroke={colors.mana} strokeWidth={2} strokeDasharray="5 4" fill="none" /> : null}
              {past ? <Path d={past} stroke={colors.hp} strokeWidth={2.5} fill="none" /> : null}
              {future ? <Path d={future} stroke={colors.hpHi} strokeWidth={2} strokeDasharray="2 4" fill="none" /> : null}

              {/* Ticks from each logged item down to its icon */}
              {placed.map(p => <Line key={'tk' + p.e.id} x1={p.x} x2={p.x} y1={BASE} y2={laneTop + p.row * LANE_ROW} stroke={colors.edgeHi} strokeWidth={1} />)}

              {marker(night.bed, colors.mana, 'BED')}
              {marker(night.now, colors.gold, 'NOW')}
              {inPlot(X(night.now)) ? <Rect x={X(night.now) - 3} y={Y(night.bacNow) - 3} width={6} height={6} fill={colors.gold} /> : null}

              {/* Peak and clear. With the what-if on, tonight's peak label moves under its marker so the blue one fits above. */}
              {inPlot(peakX) ? [
                <Rect key="pk" x={peakX - 3.5} y={peakY - 3.5} width={7} height={7} fill={colors.hpHi} stroke={colors.edge} strokeWidth={1} transform={`rotate(45 ${peakX} ${peakY})`} />,
                <SvgText key="pkt" x={Math.max(PAD_L + 40, Math.min(W - PAD_R - 40, peakX))} y={ghost ? Math.min(BASE - 22, peakY + 17) : Math.max(PAD_T + 10, peakY - 9)} fontSize={10.5} fontFamily={fonts.bodyBold} fill={colors.ink} textAnchor="middle">
                  {`Peak ${pct(night.peak)}${peakFuture ? ` · ${clock(night.peakAt)}` : ''}`}
                </SvgText>,
              ] : null}
              {inPlot(clearX) && night.soberAt > night.now ? [
                <Rect key="cl" x={clearX - 3} y={BASE - 3} width={6} height={6} fill={colors.good} />,
                <SvgText key="clt" x={Math.min(clearX, W - PAD_R)} y={BASE - 8} fontSize={10.5} fontFamily={fonts.bodyBold} fill={colors.good} textAnchor={clearX > W - PAD_R - 30 ? 'end' : 'middle'}>
                  {`Clear ~${clock(night.soberAt)}`}
                </SvgText>,
              ] : null}
              {/* The what-if's own peak and clear, in blue */}
              {ghost && inPlot(X(ghost.peakAt)) ? [
                <Rect key="gpk" x={X(ghost.peakAt) - 3.5} y={Y(ghost.peak) - 3.5} width={7} height={7} fill={colors.mana} stroke={colors.edge} strokeWidth={1} transform={`rotate(45 ${X(ghost.peakAt)} ${Y(ghost.peak)})`} />,
                <SvgText key="gpkt" x={Math.max(PAD_L + 40, Math.min(W - PAD_R - 40, X(ghost.peakAt)))} y={Math.max(PAD_T + 10, Y(ghost.peak) - 9)} fontSize={10.5} fontFamily={fonts.bodyBold} fill={colors.mana} textAnchor="middle">
                  {`Peak ${pct(ghost.peak)} · ${clock(ghost.peakAt)}`}
                </SvgText>,
              ] : null}
              {ghost && inPlot(X(ghost.soberAt)) ? [
                <Rect key="gcl" x={X(ghost.soberAt) - 3} y={BASE - 3} width={6} height={6} fill={colors.mana} />,
                <SvgText key="gclt" x={Math.min(X(ghost.soberAt), W - PAD_R)} y={BASE - 21} fontSize={10.5} fontFamily={fonts.bodyBold} fill={colors.mana} textAnchor={X(ghost.soberAt) > W - PAD_R - 30 ? 'end' : 'middle'}>
                  {`Clear ~${clock(ghost.soberAt)}`}
                </SvgText>,
              ] : null}

              {hours.map(t => (
                <SvgText key={'h' + t} x={X(t)} y={hourY} fontSize={10} fontFamily={fonts.bodyBold} fill={colors.inkFaint} textAnchor="middle">
                  {String(new Date(t).getHours()).padStart(2, '0')}:00
                </SvgText>
              ))}

              {/* Drag-to-read readout */}
              {scrubT != null ? [
                <Line key="sl" x1={sx} x2={sx} y1={PAD_T} y2={BASE} stroke={colors.ink} strokeWidth={1.5} />,
                <Rect key="sd" x={sx - 4} y={Y(sBac) - 4} width={8} height={8} fill={colors.ink} stroke={colors.edge} strokeWidth={1} />,
                sGhost != null ? <Rect key="sg" x={sx - 3.5} y={Y(sGhost) - 3.5} width={7} height={7} fill={colors.mana} /> : null,
                <Rect key="tg" x={tagX} y={PAD_T + 2} width={tagW} height={18} fill={colors.edge} opacity={0.92} />,
                <SvgText key="tt" x={tagX + 6} y={PAD_T + 15} fontSize={11} fontFamily={fonts.bodyBold} fill={colors.ink}>{tag}</SvgText>,
              ] : null}
            </Svg>

            {/* What you had, as pixel icons (drinks show their own glass) */}
            {placed.map(p => (
              <View key={'ic' + p.e.id} pointerEvents="none" style={[styles.icon, { left: p.x - ICON / 2, top: laneTop + p.row * LANE_ROW }]}>
                <PixelSprite sprite={p.e.type === 'drink' ? glassSprite(p.e) : p.e.type === 'water' ? ICONS.hydrated : ICONS.lined} scale={1} />
              </View>
            ))}

            {/* Touch layer for drag-to-read, over the plot only */}
            <View
              style={[styles.touch, { left: PAD_L, width: W - PAD_L - PAD_R, height: BASE }]}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={e => scrub(PAD_L + e.nativeEvent.locationX)}
              onResponderMove={e => scrub(PAD_L + e.nativeEvent.locationX)}
              onResponderRelease={() => setScrubT(null)}
              onResponderTerminate={() => setScrubT(null)}
              accessibilityHint="Drag across to read the level at any time"
            />
          </View>
        ) : <View style={{ height: 230 }} />}
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => setWhatIf(w => !w)} accessibilityRole="switch" accessibilityState={{ checked: whatIf }}
          style={[styles.whatIf, whatIf && styles.whatIfOn]}>
          <Text style={[styles.whatIfTxt, whatIf && { color: colors.edge }]}>{whatIf ? '✓ ' : '+ '}What if one more {last.name.toLowerCase()}?</Text>
        </Pressable>
      </View>
      <Text style={styles.key}>Solid: so far · Dotted: if you stop now{ghost ? ' · Blue: one more' : ''}. Drag across the chart to read any time.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint, backgroundColor: colors.sunk, padding: 12 },
  key: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint },
  verdict: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20 },
  icon: { position: 'absolute', width: ICON, height: ICON },
  touch: { position: 'absolute', top: 0 },
  footer: { flexDirection: 'row' },
  whatIf: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.mana },
  whatIfOn: { backgroundColor: colors.mana, borderColor: '#a9c0ff' },
  whatIfTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mana },
});
