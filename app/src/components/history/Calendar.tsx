import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { addDays, dayKey, startOfWeek, type NightSummary, type Period } from '../../../../engine/src/index.ts';
import { colors, fonts } from '../../theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const YEAR_GAP = 12;  // space between the two month columns
const MINI_PAD = 6;   // padding inside each month box
const DAY_GAP = 3;    // space between day squares in the month view
/**
 * Horizontal space around the calendar: screen padding (16 × 2), the card's pixel border (3 × 2)
 * and the card's padding (14 × 2). Keep in step with Screen.tsx and the History card style.
 */
const CARD_INSET = 16 * 2 + 3 * 2 + 14 * 2;
const MAX_CONTENT = 520;

type Cell = 'dry' | 'l1' | 'l2' | 'l3' | 'l4' | 'none' | 'future';
const level = (g: number): Cell => (g < 20 ? 'l1' : g < 45 ? 'l2' : g < 75 ? 'l3' : 'l4');
const BG: Record<Cell, string> = { dry: colors.dry, l1: colors.heat1, l2: colors.heat2, l3: colors.heat3, l4: colors.heat4, none: 'transparent', future: 'transparent' };

interface Props {
  period: Period;
  range: { start: number; end: number };
  nights: Map<string, NightSummary>;
  today: number;
  trackingStart: number;
  selected: string | null;
  onSelectDay: (key: string) => void;
  onOpenMonth: (monthStart: number) => void;
  gramsPerDrink: number;
}

export function Calendar(p: Props) {
  // Give every day square an exact pixel size, worked out from the screen width.
  // (Percentage widths plus aspectRatio collapse to thin lines on iPhone.)
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = Math.min(screenWidth, MAX_CONTENT) - CARD_INSET;
  const daySize = Math.max(0, Math.floor((contentWidth - 6 * DAY_GAP) / 7));
  const cellOf = (t: number): Cell => {
    if (t > p.today) return 'future';
    if (t < p.trackingStart) return 'none';
    const n = p.nights.get(dayKey(t));
    return n ? level(n.grams) : 'dry';
  };
  const std = (g: number) => Math.round(g / p.gramsPerDrink);
  const legend = (
    <View style={styles.legend}>
      <LegendItem color={colors.dry} label="Alcohol-free" />
      <LegendItem color={colors.heat1} label={`Under ${std(20)}`} />
      <LegendItem color={colors.heat2} label={`${std(20)}–${std(45)}`} />
      <LegendItem color={colors.heat3} label={`${std(45)}–${std(75)}`} />
      <LegendItem color={colors.heat4} label={`${std(75)}+ drinks`} />
    </View>
  );

  if (p.period === 'year') {
    const y = new Date(p.range.start).getFullYear();
    const monthWidth = Math.floor((contentWidth - YEAR_GAP) / 2);
    const cell = Math.max(0, Math.floor((monthWidth - MINI_PAD * 2) / 7));
    return (
      <View style={{ gap: 10 }}>
        <View style={styles.year}>
          {MONTHS.map((mn, m) => {
            const first = new Date(y, m, 1).getTime(), last = new Date(y, m + 1, 0).getTime();
            const has = last >= p.trackingStart && first <= p.today;
            const off = (new Date(first).getDay() + 6) % 7;
            const days = new Date(y, m + 1, 0).getDate();
            return (
              <Pressable key={mn} disabled={!has} onPress={() => p.onOpenMonth(first)} style={[styles.mini, { width: monthWidth }, !has && { opacity: 0.45 }]}
                accessibilityRole="button" accessibilityLabel={`Open ${MONTHS_LONG[m]} ${y}`}>
                <Text style={styles.miniTitle}>{mn}</Text>
                {cell > 0 ? (
                  <View style={[styles.miniGrid, { width: cell * 7 }]}>
                    {Array.from({ length: off }, (_, i) => <View key={'p' + i} style={{ width: cell, height: cell }} />)}
                    {Array.from({ length: days }, (_, d) => {
                      const c = cellOf(new Date(y, m, d + 1).getTime());
                      return <View key={d} style={[styles.miniCell, { width: cell, height: cell, backgroundColor: c === 'none' || c === 'future' ? colors.panel2 : BG[c] }]} />;
                    })}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>Tap a month to open it.</Text>
        {legend}
      </View>
    );
  }

  // Week or month: show the whole month around the selection, in full Monday–Sunday rows.
  const mid = p.period === 'week' ? addDays(p.range.start, 3) : p.range.start;
  const md = new Date(mid), month = md.getMonth(), year = md.getFullYear();
  const gridStart = startOfWeek(new Date(year, month, 1).getTime());
  const gridEnd = addDays(startOfWeek(new Date(year, month + 1, 0).getTime()), 6);
  const rows: number[][] = [];
  for (let t = gridStart; t <= gridEnd; t = addDays(t, 7)) rows.push(Array.from({ length: 7 }, (_, i) => addDays(t, i)));

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.head}>
        <Text style={styles.monthTitle}>{MONTHS_LONG[month]} {year}</Text>
        <Text style={styles.hint}>{p.period === 'week' ? 'Selected week underlined' : 'Tap a day for details'}</Text>
      </View>
      <View style={styles.row}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Text key={i} style={[styles.dow, { width: daySize, flex: 0 }]}>{d}</Text>)}
      </View>
      {daySize > 0 && rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map(t => {
            const key = dayKey(t), c = cellOf(t), inRange = t >= p.range.start && t <= p.range.end;
            const otherMonth = new Date(t).getMonth() !== month, live = c !== 'none' && c !== 'future';
            const n = p.nights.get(key);
            const label = `${new Date(t).toDateString()}: ${n ? `${n.drinks} drinks` : live ? 'alcohol-free' : 'no data'}`;
            return (
              <Pressable key={key} disabled={!live} onPress={() => p.onSelectDay(key)} accessibilityRole="button" accessibilityLabel={label}
                style={[styles.cell, { width: daySize, height: daySize, backgroundColor: live ? BG[c] : 'transparent' }, !live && styles.cellEmpty,
                  !inRange && { opacity: 0.32 }, inRange && p.period === 'week' && styles.inWeek,
                  t === p.today && styles.today, key === p.selected && styles.selected]}>
                <Text style={[styles.num, (c === 'l3' || c === 'l4') && { color: colors.heatInk }, otherMonth && { fontFamily: fonts.body }, !live && { color: colors.inkFaint }]}>
                  {new Date(t).getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      {legend}
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendTxt}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 },
  monthTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint },
  row: { flexDirection: 'row', gap: DAY_GAP },
  dow: { flex: 1, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 11, color: colors.inkFaint },
  cell: { padding: 3, backgroundColor: colors.sunk },
  cellEmpty: { borderWidth: 1, borderColor: colors.edgeHi },
  inWeek: { borderBottomWidth: 4, borderBottomColor: colors.gold },
  today: { borderWidth: 2, borderColor: colors.gold },
  selected: { borderWidth: 3, borderColor: colors.ink },
  num: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 12, height: 12, borderWidth: 1, borderColor: colors.edgeHi },
  legendTxt: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkDim },
  // Two months per row: big enough to read on a phone.
  year: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  mini: { padding: 6, backgroundColor: colors.sunk },
  miniTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, marginBottom: 6 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  miniCell: { borderWidth: 1.5, borderColor: colors.sunk },
});
