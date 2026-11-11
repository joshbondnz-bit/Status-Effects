import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { useColors, makeStyles, type Palette, fonts } from '../../theme';

export interface Bar { value: number; label?: string; valueLabel?: string; faint?: boolean; detail: string; }
export interface GuideLine { value: number; label: string; }

const W = 340, PAD_T = 22, PAD_B = 22;

/** Bar with a 4px rounded top, anchored to the baseline. */
function barPath(x: number, base: number, w: number, h: number, r = 4) {
  if (h <= 0.5) return '';
  r = Math.min(r, h, w / 2);
  const y = base - h;
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

/** A single-series bar chart with optional dashed guideline lines. Tap a bar to see its value. */
export function BarChart({ bars, lines = [], height = 160, minMax = 0, accessibilityLabel }: {
  bars: Bar[]; lines?: GuideLine[]; height?: number; minMax?: number; accessibilityLabel: string;
}) {
  const colors = useColors();
  const styles = useStyles(colors);
  const [picked, setPicked] = useState<number | null>(null);
  const max = Math.max(minMax, ...bars.map(b => b.value), 0.001) * 1.12;
  const base = height - PAD_B;
  const y = (v: number) => PAD_T + (1 - v / max) * (base - PAD_T);
  const slot = W / bars.length, bw = Math.min(18, slot - 6);

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <View>
        <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`}>
          <Line x1={0} x2={W} y1={base} y2={base} stroke={colors.edgeHi} strokeWidth={1} />
          {bars.map((b, i) => {
            const x = slot * i + (slot - bw) / 2, h = base - y(b.value);
            return (
              <Path key={i} d={barPath(x, base, bw, h)} fill={picked === i ? colors.gold : colors.hp} opacity={b.faint ? 0.5 : 1} />
            );
          })}
          {bars.map((b, i) => (b.valueLabel ? (
            <SvgText key={'v' + i} x={slot * i + slot / 2} y={y(b.value) - 5} fontSize={10} fontFamily={fonts.bodyBold} fill={colors.inkDim} textAnchor="middle">{b.valueLabel}</SvgText>
          ) : null))}
          {bars.map((b, i) => (b.label ? (
            <SvgText key={'l' + i} x={slot * i + slot / 2} y={height - 6} fontSize={10} fontFamily={fonts.bodyBold} fill={colors.inkFaint} textAnchor="middle">{b.label}</SvgText>
          ) : null))}
          {lines.map(l => (
            <Line key={'g' + l.label} x1={0} x2={W} y1={y(l.value)} y2={y(l.value)} stroke={colors.inkDim} strokeWidth={1.5} strokeDasharray="4 4" />
          ))}
          {/* Guideline labels: a thick background-coloured outline first, then the text, so they stay readable over bars */}
          {lines.map(l => (
            <SvgText key={'gh' + l.label} x={W} y={y(l.value) - 5} fontSize={10} fontFamily={fonts.bodyBold} fill={colors.panel} textAnchor="end"
              stroke={colors.panel} strokeWidth={4} strokeLinejoin="round">{l.label}</SvgText>
          ))}
          {lines.map(l => (
            <SvgText key={'gl' + l.label} x={W} y={y(l.value) - 5} fontSize={10} fontFamily={fonts.bodyBold} fill={colors.ink} textAnchor="end">{l.label}</SvgText>
          ))}
        </Svg>
        {/* Invisible tap targets, wider than the bars */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.hits}>
            {bars.map((b, i) => (
              <Pressable key={i} style={{ flex: 1 }} onPress={() => setPicked(picked === i ? null : i)} accessibilityRole="button" accessibilityLabel={b.detail} />
            ))}
          </View>
        </View>
      </View>
      <Text style={styles.detail}>{picked != null ? bars[picked].detail : 'Tap a bar for details.'}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  hits: { flex: 1, flexDirection: 'row' },
  detail: { fontFamily: fonts.body, fontSize: 13, color: colors.inkDim, marginTop: 4, minHeight: 18 },
}));
