import { StyleSheet, Text, View } from 'react-native';
import type { Night } from '../../../engine/src/index.ts';
import { FOOD, FOOD_SPRITES } from '../food';
import type { FoodCompare } from '../storage';
import { PixelSprite } from './PixelSprite';
import { colors, fonts } from '../theme';

const SCALE = 3;
const MAX_ICONS = 12;

/** Tonight's calories as a stack of pixel food, plus how much came from the alcohol itself. */
export function Rations({ night, compareWith }: { night: Night; compareWith: FoodCompare }) {
  const food = FOOD[compareWith], sprite = FOOD_SPRITES[compareWith];
  const kcal = night.kcal, fromAlcohol = night.kcalFromAlcohol, fromCarbs = Math.max(0, kcal - fromAlcohol);
  const count = kcal / food.kcal;
  const shown = Math.min(count, MAX_ICONS);
  const spriteW = (Math.max(...sprite.rows.map(r => r.length)) + 2) * SCALE;
  const icons = Array.from({ length: Math.ceil(shown - 1e-6) }, (_, i) => Math.min(1, shown - i));

  if (!kcal) return <Text style={styles.empty}>No calories logged yet.</Text>;
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.totalRow}>
        <Text style={styles.total}>{kcal.toLocaleString()}</Text>
        <Text style={styles.unit}>kcal</Text>
      </View>
      <Text style={styles.eq}>≈ {count.toFixed(1)} {Math.abs(count - 1) < 0.05 ? food.one : food.many}</Text>
      <View style={styles.icons} accessible accessibilityLabel={`About ${count.toFixed(1)} ${food.many}`}>
        {icons.map((frac, i) => (
          // The last item is cut off to show a fraction, like a half-eaten slice.
          <View key={i} style={{ width: spriteW * frac, overflow: 'hidden' }}>
            <PixelSprite sprite={sprite} scale={SCALE} />
          </View>
        ))}
        {count > MAX_ICONS ? <Text style={styles.more}>+{(count - MAX_ICONS).toFixed(1)}</Text> : null}
      </View>
      <View style={styles.split} accessible={false}>
        <View style={{ flex: fromAlcohol, backgroundColor: colors.warn }} />
        {fromCarbs > 0 ? <View style={{ flex: fromCarbs, backgroundColor: colors.mana }} /> : null}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: colors.warn }]} /><Text style={styles.legendTxt}>{fromAlcohol} from the alcohol itself</Text></View>
        <View style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: colors.mana }]} /><Text style={styles.legendTxt}>{fromCarbs} from sugars and carbs</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint, backgroundColor: colors.sunk, padding: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  total: { fontFamily: fonts.num, fontSize: 40, color: colors.ink, lineHeight: 40 },
  unit: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.5, color: colors.inkDim },
  eq: { fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'flex-end' },
  more: { fontFamily: fonts.num, fontSize: 22, color: colors.inkDim },
  split: { flexDirection: 'row', height: 10, gap: 2 },
  legend: { gap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10 },
  legendTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.inkDim },
});
