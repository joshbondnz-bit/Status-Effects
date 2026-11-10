import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { HOUR, MIN, THRESHOLDS, type Night } from '../../../engine/src/index.ts';
import { colors, fonts } from '../theme';

const W = 340, H = 190, PAD_L = 28, PAD_R = 8, PAD_T = 16, PAD_B = 22;

/** Blood alcohol over the night: solid so far, dotted for the projection, with milestones, drinks, now and bedtime. */
export function CurveChart({ night }: { night: Night }) {
  if (!night.drinks.length) return <Text style={styles.empty}>Your curve appears after the first drink.</Text>;

  const x0 = night.t0;
  const x1 = Math.max(night.now + HOUR, night.soberAt + 30 * MIN, Math.min(night.bed, night.now + 10 * HOUR) + 15 * MIN);
  const yMax = Math.max(0.1, night.peak * 1.2);
  const X = (t: number) => PAD_L + ((t - x0) / (x1 - x0)) * (W - PAD_L - PAD_R);
  const Y = (b: number) => PAD_T + (1 - b / yMax) * (H - PAD_T - PAD_B);
  const base = Y(0);
  const nowIdx = Math.round((night.now - x0) / MIN);

  // Sample every 2 minutes: plenty of detail, fewer points to draw.
  const past: [number, number][] = [], future: [number, number][] = [];
  for (let k = 0; k < night.samples.length; k += 2) {
    const t = x0 + k * MIN;
    if (t > x1) break;
    const pt: [number, number] = [X(t), Y(night.samples[k])];
    if (k <= nowIdx) past.push(pt);
    if (k >= nowIdx - 1) future.push(pt);
  }
  const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const area = past.length > 1 ? `${line(past)}L${past[past.length - 1][0].toFixed(1)},${base}L${past[0][0].toFixed(1)},${base}Z` : '';

  // Hour labels: every 1, 2 or 4 hours depending on how long the chart spans.
  const span = x1 - x0, step = span > 14 * HOUR ? 4 : span > 7 * HOUR ? 2 : 1;
  const hours: number[] = [];
  const h0 = new Date(x0); h0.setMinutes(0, 0, 0);
  for (let t = h0.getTime() + HOUR; t < x1; t += HOUR) if (new Date(t).getHours() % step === 0) hours.push(t);

  const marker = (t: number, color: string, label: string) => {
    const x = X(t);
    if (x < PAD_L || x > W - PAD_R) return null;
    return [
      <Line key={label + 'l'} x1={x} x2={x} y1={PAD_T - 4} y2={base} stroke={color} strokeWidth={2} />,
      <SvgText key={label + 't'} x={Math.min(x + 3, W - PAD_R - 22)} y={PAD_T - 6} fontSize={10} fontFamily={fonts.bodyBold} fill={color}>{label}</SvgText>,
    ];
  };

  return (
    <View accessible accessibilityLabel={`Estimated blood alcohol curve. Peak ${night.peak.toFixed(3)}%, cleared around ${new Date(night.soberAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {THRESHOLDS.slice(1).filter(th => th <= yMax).map(th => (
          <Line key={'th' + th} x1={PAD_L} x2={W - PAD_R} y1={Y(th)} y2={Y(th)} stroke={colors.edgeHi} strokeWidth={1} strokeDasharray="3 4" />
        ))}
        {THRESHOLDS.slice(1).filter(th => th <= yMax).map(th => (
          <SvgText key={'tl' + th} x={2} y={Y(th) + 3} fontSize={10} fontFamily={fonts.bodyBold} fill={colors.inkFaint}>{th.toFixed(2).slice(1)}</SvgText>
        ))}
        <Line x1={PAD_L} x2={W - PAD_R} y1={base} y2={base} stroke={colors.edgeHi} strokeWidth={1} />
        {hours.map(t => (
          <SvgText key={'h' + t} x={X(t)} y={H - 6} fontSize={10} fontFamily={fonts.bodyBold} fill={colors.inkFaint} textAnchor="middle">
            {String(new Date(t).getHours()).padStart(2, '0')}:00
          </SvgText>
        ))}
        {area ? <Path d={area} fill={colors.hp} opacity={0.22} /> : null}
        {past.length > 1 ? <Path d={line(past)} stroke={colors.hp} strokeWidth={2.5} fill="none" /> : null}
        {future.length > 1 ? <Path d={line(future)} stroke={colors.hpHi} strokeWidth={2} strokeDasharray="2 4" fill="none" /> : null}
        {night.drinks.map(d => {
          const x = X(d.t);
          return x >= PAD_L && x <= W - PAD_R ? <Rect key={d.id} x={x - 2} y={base - 2} width={4} height={4} fill={colors.gold} /> : null;
        })}
        {marker(night.bed, colors.mana, 'BED')}
        {marker(night.now, colors.gold, 'NOW')}
        {night.now <= x1 ? <Rect x={X(night.now) - 3} y={Y(night.bacNow) - 3} width={6} height={6} fill={colors.gold} /> : null}
      </Svg>
      <Text style={styles.key}>Solid: so far · Dotted: projected if you stop now · Gold squares: drinks</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint, backgroundColor: colors.sunk, padding: 12 },
  key: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint, marginTop: 4 },
});
