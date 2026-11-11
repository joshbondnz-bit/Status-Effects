import { Pressable, Text, View } from 'react-native';
import { standardDrinks, type LogEvent, type RegionCode } from '../../../engine/src/index.ts';
import { useColors, makeStyles, type Palette, fonts } from '../theme';
import { clock, money } from '../format';

interface Props {
  events: LogEvent[];
  region: RegionCode;
  onRemove: (e: LogEvent) => void;
}

/** Tonight's entries, newest first, each with a remove button. */
export function NightLog({ events, region, onRemove }: Props) {
  const colors = useColors();
  const styles = useStyles(colors);
  const items = [...events].sort((a, b) => b.t - a.t);
  if (!items.length) return <Text style={styles.empty}>Nothing logged yet.</Text>;
  return (
    <View style={{ gap: 2 }}>
      {items.map(e => {
        const label = e.type === 'drink' ? e.name : e.type === 'water' ? 'Water' : 'Food';
        const sub = e.type === 'drink' ? `${e.size ?? e.ml + ' ml'} · ${e.abv}%` : e.type === 'water' ? 'Hydrated buff' : 'Slows absorption for 3 h';
        const qty = e.type === 'drink' ? `${standardDrinks(e.grams, region).toFixed(1)} std${e.cost != null ? ` · ${money(e.cost)}` : ''}` : '';
        return (
          <View key={e.id} style={styles.row}>
            <Text style={styles.time}>{clock(e.t)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{label}</Text>
              <Text style={styles.sub}>{sub}</Text>
            </View>
            <Text style={styles.qty}>{qty}</Text>
            <Pressable onPress={() => onRemove(e)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${label} at ${clock(e.t)}`} style={styles.del}>
              <Text style={styles.delTxt}>×</Text>
            </Pressable>
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
  del: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  delTxt: { fontSize: 20, color: colors.inkFaint },
}));
