// Add or edit a custom drink: name, size, strength, calories and price (per drink or as a pack).
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { REGIONS, alcoholGrams, costPerDrink, makeDrink, type DrinkCategory, type DrinkPreview, type DrinkSpec, type RegionCode } from '../../../engine/src/index.ts';
import { savedToSpec, type Price, type SavedDrink } from '../storage';
import { useColors, makeStyles, type Palette, fonts } from '../theme';
import { money } from '../format';
import { Field, PixelButton, Segmented, ToggleRow } from './Form';
import { PreviewLine } from './PreviewLine';

const ML_PER_OZ = 29.5735;

const CATEGORIES: { value: DrinkCategory; label: string }[] = [
  { value: 'beer', label: 'Beer/cider' }, { value: 'wine', label: 'Wine' }, { value: 'spirits', label: 'Spirits' }, { value: 'mixed', label: 'Mixed' },
];

/** A blank-able text box for numbers (empty is allowed, unlike NumberInput). */
function NumText({ value, onChange, label, suffix, prefix, placeholder }: { value: string; onChange: (s: string) => void; label: string; suffix?: string; prefix?: string; placeholder?: string }) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <View style={styles.inputRow}>
      {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
      <TextInput value={value} onChangeText={onChange} accessibilityLabel={label} keyboardType="decimal-pad" inputMode="decimal"
        placeholder={placeholder} placeholderTextColor={colors.inkFaint} style={styles.input} selectTextOnFocus />
      {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
    </View>
  );
}

const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return isFinite(n) ? n : NaN; };
const trimNum = (n: number) => String(Math.round(n * 100) / 100);

interface Props {
  /** The drink being edited, or a starting point for a new one (e.g. a preset to customise). */
  initial: Partial<SavedDrink>;
  /** 'edit' changes a saved drink; 'new' creates one (and can log it straight away). */
  mode: 'new' | 'edit';
  region: RegionCode;
  showCalories: boolean;
  preview: (spec: DrinkSpec) => DrinkPreview;
  onLog: (spec: DrinkSpec, save: SavedDrink | null) => void;
  onSave: (d: SavedDrink) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export function DrinkForm({ initial, mode, region, showCalories, preview, onLog, onSave, onDelete, onBack }: Props) {
  const colors = useColors();
  const styles = useStyles(colors);
  const [name, setName] = useState(initial.name ?? '');
  const [size, setSize] = useState(initial.size ?? '');
  const [volUnit, setVolUnit] = useState<'ml' | 'oz'>('ml');
  const [vol, setVol] = useState(initial.ml ? trimNum(initial.ml) : '');
  const [abv, setAbv] = useState(initial.abv != null ? trimNum(initial.abv) : '');
  const [category, setCategory] = useState<DrinkCategory>(initial.category ?? 'beer');
  const [kcal, setKcal] = useState(initial.kcal != null ? String(initial.kcal) : '');
  const [priceMode, setPriceMode] = useState<'none' | 'drink' | 'pack'>(initial.price?.per ?? 'none');
  const [price, setPrice] = useState(initial.price ? trimNum(initial.price.amount) : '');
  const [count, setCount] = useState(initial.price?.per === 'pack' ? String(initial.price.count) : '6');
  const [save, setSave] = useState(true);
  const [trackLeft, setTrackLeft] = useState(initial.left != null);
  const [left, setLeft] = useState(initial.left != null ? String(initial.left) : '');

  const switchUnit = (u: 'ml' | 'oz') => {
    const n = num(vol);
    if (isFinite(n) && u !== volUnit) setVol(trimNum(u === 'oz' ? n / ML_PER_OZ : n * ML_PER_OZ));
    setVolUnit(u);
  };

  // Validate and build the drink.
  const ml = volUnit === 'oz' ? num(vol) * ML_PER_OZ : num(vol);
  const abvN = num(abv), kcalN = num(kcal), priceN = num(price), countN = Math.round(num(count));
  const errors: string[] = [];
  if (!name.trim()) errors.push('Give it a name.');
  if (!(ml > 0 && ml <= 5000)) errors.push('Volume should be between 1 and 5000 ml.');
  if (!(abv.trim() !== '' && abvN >= 0 && abvN <= 80)) errors.push('Strength should be between 0 and 80%.');
  if (kcal.trim() && !(kcalN >= 0 && kcalN < 5000)) errors.push('Calories look off.');
  if (priceMode !== 'none' && !(priceN > 0 && priceN < 10000)) errors.push('Enter a price, or choose No price.');
  if (priceMode === 'pack' && !(countN >= 2 && countN <= 100)) errors.push('A pack should have 2 to 100 drinks.');
  // "Left" defaults to a full pack; logging it now uses one straight away.
  const leftN = left.trim() === '' ? countN : Math.round(num(left));
  const tracking = priceMode === 'pack' && trackLeft;
  if (tracking && !(leftN >= 0 && leftN <= countN)) errors.push(`Left should be between 0 and ${countN || 'the pack size'}.`);
  const valid = errors.length === 0;

  const draft: SavedDrink | null = valid ? {
    id: initial.id ?? `my-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(), size: size.trim() || undefined, ml: Math.round(ml), abv: Math.round(abvN * 10) / 10, category,
    kcal: kcal.trim() ? Math.round(kcalN) : undefined,
    price: priceMode === 'drink' ? { per: 'drink', amount: priceN } : priceMode === 'pack' ? { per: 'pack', amount: priceN, count: countN } as Price : undefined,
    left: tracking ? leftN : undefined,
  } : null;
  const spec = draft ? savedToSpec(draft) : null;
  const pv = useMemo(() => (spec ? preview(spec) : null), [spec?.ml, spec?.abv]); // eslint-disable-line react-hooks/exhaustive-deps
  const std = spec ? alcoholGrams(spec.ml, spec.abv) / REGIONS[region].gramsPerStandardDrink : null;
  const estKcal = spec ? makeDrink(spec, 0, 'x').kcal : null;

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onBack} accessibilityRole="button"><Text style={styles.back}>‹ Back to drinks</Text></Pressable>
      <Text style={styles.title}>{mode === 'edit' ? 'Edit drink' : 'Custom drink'}</Text>

      <Field stack label="Name"><TextInput value={name} onChangeText={setName} accessibilityLabel="Name" placeholder="e.g. Fat Tug IPA" placeholderTextColor={colors.inkFaint} style={styles.input} /></Field>
      <Field stack label="Size (optional)"><TextInput value={size} onChangeText={setSize} accessibilityLabel="Size" placeholder="e.g. Can, Pint, Glass" placeholderTextColor={colors.inkFaint} style={styles.input} /></Field>
      <View style={styles.row}>
        <Field label="Volume" minWidth={130}>
          <NumText value={vol} onChange={setVol} label={`Volume in ${volUnit}`} />
          <Segmented label="Volume unit" value={volUnit} onChange={switchUnit} options={[{ value: 'ml', label: 'ml' }, { value: 'oz', label: 'oz' }]} />
        </Field>
        <Field label="Strength" minWidth={110}><NumText value={abv} onChange={setAbv} label="Alcohol by volume, percent" suffix="%" placeholder="5" /></Field>
      </View>
      <Field stack label="Type"><Segmented label="Type" value={category} onChange={setCategory} options={CATEGORIES} /></Field>
      {showCalories ? (
        <Field stack label="Calories (optional)" hint={kcal.trim() ? undefined : estKcal != null ? `Leave blank to estimate (about ${estKcal} kcal).` : 'Leave blank to estimate.'}>
          <NumText value={kcal} onChange={setKcal} label="Calories from the label" suffix="kcal" />
        </Field>
      ) : null}

      <Field stack label="Price">
        <Segmented label="Price" value={priceMode} onChange={setPriceMode}
          options={[{ value: 'none', label: 'No price' }, { value: 'drink', label: 'Per drink' }, { value: 'pack', label: 'Pack' }]} />
        {priceMode !== 'none' ? (
          <View style={styles.row}>
            <View style={{ flex: 1, minWidth: 120 }}><NumText value={price} onChange={setPrice} label={priceMode === 'pack' ? 'Pack price' : 'Price per drink'} prefix="$" /></View>
            {priceMode === 'pack' ? <View style={{ flex: 1, minWidth: 120 }}><NumText value={count} onChange={setCount} label="Drinks in the pack" suffix="drinks" /></View> : null}
          </View>
        ) : null}
        {priceMode === 'pack' && priceN > 0 && countN >= 2 ? <Text style={styles.hint}>= {money(costPerDrink(priceN, countN))} a drink, logged each time you have one.</Text> : null}
        {priceMode === 'pack' ? (
          <>
            <ToggleRow value={trackLeft} onChange={setTrackLeft} title="Count what's left"
              body="Counts down each time you log one. When the pack runs out, it asks if you bought another." />
            {trackLeft ? (
              <View style={{ maxWidth: 200 }}>
                <NumText value={left} onChange={setLeft} label="How many are left" suffix="left" placeholder={String(countN || 6)} />
              </View>
            ) : null}
          </>
        ) : null}
      </Field>

      {spec && pv ? (
        <View style={styles.previewBox}>
          <Text style={styles.previewHead}>If you have this now</Text>
          <PreviewLine p={pv} big />
          <Text style={styles.hint}>{std!.toFixed(1)} std drinks{showCalories ? ` · ${estKcal} kcal` : ''}{spec.cost != null ? ` · ${money(spec.cost)}` : ''}</Text>
        </View>
      ) : errors.length && (name || vol || abv) ? <Text style={styles.err}>{errors[0]}</Text> : null}

      {mode === 'new' ? (
        <>
          <ToggleRow value={save} onChange={setSave} title="Save to My drinks" body="Log it again with one tap next time." />
          <View style={styles.row}>
            <PixelButton label="Log it now" primary flex={1} disabled={!valid}
              onPress={() => draft && onLog(savedToSpec(draft), save ? { ...draft, left: draft.left != null ? Math.max(0, draft.left - 1) : undefined } : null)} />
            {save ? <PixelButton label="Just save" flex={1} disabled={!valid} onPress={() => draft && onSave(draft)} /> : null}
          </View>
        </>
      ) : (
        <View style={styles.row}>
          <PixelButton label="Save changes" primary flex={1} disabled={!valid} onPress={() => draft && onSave(draft)} />
          <PixelButton label="Delete" flex={1} onPress={() => initial.id && onDelete(initial.id)} />
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  wrap: { gap: 12 },
  back: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mana },
  title: { fontFamily: fonts.display, fontSize: 31, letterSpacing: 0.4, color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minWidth: 0, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi, color: colors.ink, fontFamily: fonts.body, fontSize: 17, paddingHorizontal: 10, paddingVertical: 9 },
  affix: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkDim },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, lineHeight: 18 },
  err: { fontFamily: fonts.body, fontSize: 13.5, color: colors.warn },
  previewBox: { backgroundColor: colors.sunk, padding: 12, gap: 4, borderLeftWidth: 4, borderLeftColor: colors.hp },
  previewHead: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 0.6, color: colors.inkDim, textTransform: 'uppercase' },
}));
