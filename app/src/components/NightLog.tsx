import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { standardDrinks, type LogEvent, type RegionCode } from '../../../engine/src/index.ts';
import { useColors, makeStyles, type Palette, fonts } from '../theme';
import { clock, money } from '../format';

interface Props {
  events: LogEvent[];
  region: RegionCode;
  onRemove: (e: LogEvent) => void;
  /** Move an entry's time by this many minutes (e.g. it was logged late). */
  onShift: (e: LogEvent, minutes: number) => void;
  now: number;
}

/** Tonight's entries, newest first, each with a remove button. Tap an entry to nudge its time. */
export function NightLog({ events, region, onRemove, onShift, now }: Props) {
  const colors = useColors();
  const styles = useStyles(colors);
  const [openId, setOpenId] = useState<string | null>(null);
  const items = [...events].sort((a, b) => b.t - a.t);
  if (!items.length) return <Text style={styles.empty}>Nothing logged yet.</Text>;
  return (
    <View style={{ gap: 2 }}>
      {items.map(e => {
        const label = e.type === 'drink' ? e.name : e.type === 'water' ? 'Water' : 'Food';
        const sub = e.type === 'drink' ? `${e.size ?? e.ml + ' ml'} · ${e.abv}%` : e.type === 'water' ? 'Hydrated buff' : 'Slows absorption for 3 h';
        const qty = e.type === 'drink' ? `${standardDrinks(e.grams, region).toFixed(1)} std${e.cost != null ? ` · ${money(e.cost)}` : ''}` : '';
        return (
          <View key={e.id}>
          <View style={styles.row}>
            <Pressable onPress={() => setOpenId(openId === e.id ? null : e.id)} style={styles.main} accessibilityRole="button"
              accessibilityState={{ expanded: openId === e.id }} accessibilityLabel={`${label} at ${clock(e.t)}. Change time`}>
            <Text style={[styles.time, openId === e.id && { color: colors.gold }]}>{clock(e.t)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{label}</Text>
              <Text style={styles.sub}>{sub}</Text>
            </View>
            <Text style={styles.qty}>{qty}</Text>
            </Pressable>
            <Pressable onPress={() => onRemove(e)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${label} at ${clock(e.t)}`} style={styles.del}>
              <Text style={styles.delTxt}>×</Text>
            </Pressable>
          </View>
          {openId === e.id ? (
            <View style={styles.shift}>
              <Text style={styles.shiftTxt}>Move it</Text>
              <Pressable onPress={() => onShift(e, -10)} style={styles.shiftBtn} accessibilityRole="button" accessibilityLabel="10 minutes earlier"><Text style={styles.shiftBtnTxt}>◀ 10 min earlier</Text></Pressable>
              <Pressable onPress={() => onShift(e, 10)} disabled={e.t + 10 * 60_000 > now} style={[styles.shiftBtn, e.t + 10 * 60_000 > now && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="10 minutes later"><Text style={styles.shiftBtnTxt}>later ▶</Text></Pressable>
            </View>
          ) : null}
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint, backgroundColor: colors.sunk, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.sunk, paddingVertical: 8, paddingHorizontal: 10 },
  time: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkDim, width: 44 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint },
  qty: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  shift: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.sunk, paddingHorizontal: 10, paddingBottom: 8 },
  shiftTxt: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint },
  shiftBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.edge },
  shiftBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  del: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  delTxt: { fontSize: 20, color: colors.inkFaint },
}));
