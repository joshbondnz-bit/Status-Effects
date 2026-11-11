// Rations: tonight's calories as a share of what you need in a day, in food terms, drink by drink,
// and what alcohol calories are. Matter-of-fact: no exercise, no "burn it off", no colour judgement.
import { StyleSheet, Text, View } from 'react-native';
import { dailyCalories, type DrinkEvent, type Night } from '../../../engine/src/index.ts';
import { FOOD, FOOD_SPRITES } from '../food';
import type { FoodCompare } from '../storage';
import { ICONS, glassSprite } from '../sprites';
import { PixelSprite } from './PixelSprite';
import { useColors, makeStyles, type Palette, fonts } from '../theme';
import { duration } from '../format';

const SEGMENTS = 24;          // the meter is one whole day of calories
const FOOD_SCALE = 3;
const MAX_FOOD = 12;
const GOLD_HI = '#ffe39a', GOLD_LO = '#b8862a';

interface Group { key: string; d: DrinkEvent; n: number; kcal: number; alc: number }

/** Identical drinks merged ("Lager ×2"), biggest calorie total first. */
function groupDrinks(drinks: DrinkEvent[]): Group[] {
  const map = new Map<string, Group>();
  for (const d of drinks) {
    const key = `${d.name}|${d.size ?? ''}|${d.ml}|${d.abv}`;
    const g = map.get(key) ?? { key, d, n: 0, kcal: 0, alc: 0 };
    g.n++; g.kcal += d.kcal; g.alc += d.kcalFromAlcohol;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.kcal - a.kcal);
}

export function Rations({ night, compareWith, fatPauseMs, whatIf }: {
  night: Night; compareWith: FoodCompare; fatPauseMs?: number; whatIf: boolean;
}) {
  const colors = useColors();
  const styles = useStyles(colors);
  const kcal = night.kcal;
  if (!kcal) return <Text style={styles.empty}>No calories logged yet.</Text>;

  const day = dailyCalories(night.profile);
  const alc = night.kcalFromAlcohol, carbs = Math.max(0, kcal - alc);
  const last = night.drinks[night.drinks.length - 1];
  const extra = whatIf && last ? last.kcal : 0;
  const share = kcal / day, shareWith = (kcal + extra) / day;
  const on = Math.min(SEGMENTS, Math.round(share * SEGMENTS)), ghostTo = Math.min(SEGMENTS, Math.round(shareWith * SEGMENTS));

  const food = FOOD[compareWith], sprite = FOOD_SPRITES[compareWith];
  const count = (kcal + extra) / food.kcal;
  const shown = Math.min(count, MAX_FOOD);
  const spriteW = (Math.max(...sprite.rows.map(r => r.length)) + 2) * FOOD_SCALE;
  const foodIcons = Array.from({ length: Math.ceil(shown - 1e-6) }, (_, i) => Math.min(1, shown - i));

  const groups = groupDrinks(night.drinks);
  const maxKcal = Math.max(...groups.map(g => g.kcal), extra);

  return (
    <View style={{ gap: 16 }}>
      {/* Share of the day */}
      <View>
        <View style={styles.totalRow}>
          <Text style={styles.total}>{kcal.toLocaleString()}</Text>
          <Text style={styles.unit}>kcal</Text>
          {extra ? <Text style={[styles.unit, { color: colors.mana }]}>→ {(kcal + extra).toLocaleString()}</Text> : null}
        </View>
        <Text style={styles.sentence}>
          That's <Text style={styles.gold}>{Math.round(share * 100)}%</Text> of the calories you need in a day{share >= 1 ? ': more than a whole day’s worth' : ''}.
        </Text>
        <View style={styles.meter} accessible accessibilityLabel={`${Math.round(share * 100)} percent of a day's calories`}>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <View key={i} style={[styles.seg, i < on ? styles.segOn : i < ghostTo ? styles.segGhost : null]}>
              {i < on ? <><View style={[styles.band, { backgroundColor: GOLD_HI }]} /><View style={[styles.band, { flex: 2, backgroundColor: colors.gold }]} /><View style={[styles.band, { backgroundColor: GOLD_LO }]} /></> : null}
            </View>
          ))}
        </View>
        <View style={styles.ticks}>
          {['0', '¼', '½', '¾', '1 day'].map((t, i) => (
            <Text key={t} style={i === 4 ? [styles.tick, styles.tickEnd] : [styles.tick, { left: `${i * 25}%` }, i ? styles.tickMid : null]}>{t}</Text>
          ))}
        </View>
        <Text style={styles.note}>Based on your character sheet, you need about {day.toLocaleString()} kcal a day.</Text>
        {extra ? <Text style={styles.ghostNote}>One more {last!.name.toLowerCase()} adds {extra} kcal, taking tonight to {Math.round(shareWith * 100)}% of what you need in a day.</Text> : null}
      </View>

      {/* In food terms */}
      <View style={styles.food}>
        <View style={styles.foodIcons} accessible accessibilityLabel={`About ${count.toFixed(1)} ${food.many}`}>
          {foodIcons.map((frac, i) => (
            // The last one is cut off to show a fraction, like a half-eaten slice.
            <View key={i} style={{ width: spriteW * frac, overflow: 'hidden' }}>
              <PixelSprite sprite={sprite} scale={FOOD_SCALE} />
            </View>
          ))}
          {count > MAX_FOOD ? <Text style={styles.more}>+{(count - MAX_FOOD).toFixed(1)}</Text> : null}
        </View>
        <Text style={styles.foodTxt}>About the same as <Text style={styles.bold}>{count.toFixed(1)} {Math.abs(count - 1) < 0.05 ? food.one : food.many}</Text></Text>
      </View>

      {/* Drink by drink */}
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Drink by drink</Text>
        {groups.map(g => (
          <Item key={g.key} d={g.d} n={g.n} kcal={g.kcal} alc={g.alc} max={maxKcal} />
        ))}
        {extra && last ? <Item d={last} n={1} kcal={last.kcal} alc={last.kcalFromAlcohol} max={maxKcal} ghost /> : null}
      </View>

      {/* What the calories are */}
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>What the calories are</Text>
        <View style={styles.split}>
          <View style={{ flex: alc, backgroundColor: colors.gold }} />
          {carbs > 0 ? <View style={{ flex: carbs, backgroundColor: colors.mana }} /> : null}
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendTxt}><Text style={[styles.swatch, { color: colors.gold }]}>■ </Text><Text style={styles.bold}>{alc}</Text> from alcohol: no nutrients</Text>
          <Text style={styles.legendTxt}><Text style={[styles.swatch, { color: colors.mana }]}>■ </Text><Text style={styles.bold}>{carbs}</Text> from sugars and carbs</Text>
        </View>
        {fatPauseMs && fatPauseMs > 60_000 ? (
          <View style={styles.link}>
            <PixelSprite sprite={ICONS.fatpause} scale={1.5} />
            <Text style={styles.linkTxt}>Your body clears alcohol before anything else, so <Text style={styles.bold}>fat burning is paused for {duration(fatPauseMs)}</Text> tonight.</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Item({ d, n, kcal, alc, max, ghost }: { d: DrinkEvent; n: number; kcal: number; alc: number; max: number; ghost?: boolean }) {
  const colors = useColors();
  const styles = useStyles(colors);
  const carbs = Math.max(0, kcal - alc);
  return (
    <View style={[styles.item, ghost && styles.itemGhost]}>
      <View style={styles.itemIcon}><PixelSprite sprite={glassSprite(d)} scale={2} /></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.itemName} numberOfLines={1}>
          {ghost ? `One more ${d.name.toLowerCase()}` : d.name}{n > 1 ? ` ×${n}` : ''}
          {d.size ? <Text style={styles.itemSize}> · {d.size}</Text> : null}
        </Text>
        <View style={styles.itemBar}>
          <View style={{ width: `${(alc / max) * 100}%`, backgroundColor: ghost ? colors.mana : colors.gold }} />
          <View style={{ width: `${(carbs / max) * 100}%`, backgroundColor: colors.mana, opacity: ghost ? 0.5 : 1 }} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.kcal, ghost && { color: colors.mana }]}>{ghost ? '+' : ''}{kcal}</Text>
        <Text style={styles.kcalSub}>{n > 1 ? `${Math.round(kcal / n)} each` : 'kcal'}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint, backgroundColor: colors.sunk, padding: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  total: { fontFamily: fonts.display, fontSize: 52, lineHeight: 52, color: colors.ink },
  unit: { fontFamily: fonts.display, fontSize: 26, color: colors.inkDim },
  sentence: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, lineHeight: 21, marginTop: 2 },
  gold: { fontFamily: fonts.bodyBold, color: colors.gold },
  bold: { fontFamily: fonts.bodyBold, color: colors.ink },
  meter: { flexDirection: 'row', gap: 2, padding: 3, backgroundColor: colors.edge, marginTop: 10 },
  seg: { flex: 1, height: 16, backgroundColor: colors.meterEmpty },
  segOn: { backgroundColor: colors.gold },
  segGhost: { backgroundColor: colors.mana, opacity: 0.55 },
  band: { flex: 1 },
  ticks: { height: 16, marginTop: 3, marginHorizontal: 3 },
  tick: { position: 'absolute', top: 0, fontFamily: fonts.bodyBold, fontSize: 11, color: colors.inkFaint },
  tickMid: { transform: [{ translateX: -4 }] },
  tickEnd: { right: 0 },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, marginTop: 4 },
  ghostNote: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.mana, marginTop: 6 },
  food: { backgroundColor: colors.sunk, padding: 12, gap: 8 },
  foodIcons: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'flex-end' },
  more: { fontFamily: fonts.num, fontSize: 22, color: colors.inkDim },
  foodTxt: { fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 0.7, color: colors.inkDim, textTransform: 'uppercase' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.edge, paddingVertical: 7, paddingHorizontal: 10 },
  itemGhost: { backgroundColor: 'transparent', borderColor: colors.mana, borderStyle: 'dashed' },
  itemIcon: { width: 30, alignItems: 'center' },
  itemName: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink },
  itemSize: { fontFamily: fonts.body, color: colors.inkFaint },
  itemBar: { flexDirection: 'row', height: 6, backgroundColor: colors.sunk },
  kcal: { fontFamily: fonts.display, fontSize: 26, lineHeight: 26, color: colors.ink },
  kcalSub: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  split: { flexDirection: 'row', height: 12, borderWidth: 2, borderColor: colors.edge },
  legend: { gap: 2 },
  swatch: { fontSize: 13 },
  legendTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.inkDim },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.sevUnrated, padding: 10, marginTop: 4 },
  linkTxt: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, color: colors.inkDim, lineHeight: 19 },
}));
