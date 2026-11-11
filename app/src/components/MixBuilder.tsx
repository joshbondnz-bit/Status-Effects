// Build your own mixed drink: pick the spirit (single or double), add more spirits if it has them,
// pick a mixer or none. It names itself ("Double rum and cola") and shows what it would do before logging.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  MIXERS, MIXER_ML, MIX_SPIRITS, REGIONS, alcoholGrams, makeDrink, mixDrink, shotMl,
  type DrinkPreview, type DrinkSpec, type RegionCode,
} from '../../../engine/src/index.ts';
import type { SavedDrink } from '../storage';
import { useColors, makeStyles, type Palette, fonts } from '../theme';
import { PixelButton } from './Form';
import { hpText, zoneWarning } from './PreviewLine';

type Part = { spirit: number; double: boolean };
const MAX_SPIRITS = 3;

/** "Vodka", "Gin and rum", "Gin, vodka and rum". */
const listOf = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

export function MixBuilder({ region, showCalories, preview, onLog, onSaveAndLog, onBack }: {
  region: RegionCode; showCalories: boolean; preview: (spec: DrinkSpec) => DrinkPreview;
  onLog: (spec: DrinkSpec) => void; onSaveAndLog: (saved: SavedDrink, spec: DrinkSpec) => void; onBack: () => void;
}) {
  const colors = useColors();
  const styles = useStyles(colors);
  const [parts, setParts] = useState<Part[]>([{ spirit: 0, double: false }]);
  const [mixer, setMixer] = useState<number | null>(0); // index into MIXERS, or null for no mixer
  const [newId] = useState(() => `my-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);

  const shot = shotMl(region);
  const set = (i: number, patch: Partial<Part>) => setParts(ps => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  // Name and size, e.g. "Double rum and cola" · "Double + 150 ml cola".
  const names = [...new Set(parts.map(p => MIX_SPIRITS[p.spirit].name))]; // each spirit once
  const lone = parts.length === 1;
  const several = names.length > 1;
  const spirits = lone
    ? (parts[0].double ? `Double ${names[0].toLowerCase()}` : names[0])
    : listOf(names.map((n, i) => (i ? n.toLowerCase() : n)));
  const mix = mixer != null ? MIXERS[mixer] : null;
  // 'Rum and cola', but 'Rum and gin with cola' when there's more than one spirit.
  const name = mix ? `${spirits} ${several ? 'with' : 'and'} ${mix.name.toLowerCase()}` : spirits;
  const shots = parts.reduce((t, p) => t + (p.double ? 2 : 1), 0);
  const size = `${lone ? (parts[0].double ? 'Double' : 'Single') : `${shots} shots`}${mix ? ` + ${MIXER_ML} ml ${mix.name.toLowerCase()}` : ''}`;
  const spec = mixDrink(name, size, parts.map(p => ({ abv: MIX_SPIRITS[p.spirit].abv, ml: shot * (p.double ? 2 : 1) })), mix);

  const p = preview(spec);
  const warn = zoneWarning(p, colors);
  const made = makeDrink(spec, 0, 'x');
  const std = alcoholGrams(spec.ml, spec.abv) / REGIONS[region].gramsPerStandardDrink;

  return (
    <View style={{ gap: 12 }}>
      <Pressable onPress={onBack} accessibilityRole="button"><Text style={styles.back}>‹ Back to drinks</Text></Pressable>
      <Text style={styles.h}>Build a mixed drink</Text>

      {parts.map((part, i) => (
        <View key={i} style={styles.block}>
          <View style={styles.blockHead}>
            <Text style={styles.label}>{i === 0 ? 'SPIRIT' : `SPIRIT ${i + 1}`}</Text>
            {i > 0 ? (
              <Pressable onPress={() => setParts(ps => ps.filter((_, j) => j !== i))} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove spirit ${i + 1}`}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.chips}>
            {MIX_SPIRITS.map((s, k) => <Chip key={s.name} label={s.name} on={part.spirit === k} onPress={() => set(i, { spirit: k })} />)}
          </View>
          <View style={styles.chips}>
            <Chip label={`Single · ${shot} ml`} on={!part.double} onPress={() => set(i, { double: false })} />
            <Chip label={`Double · ${shot * 2} ml`} on={part.double} onPress={() => set(i, { double: true })} />
          </View>
        </View>
      ))}
      {parts.length < MAX_SPIRITS ? (
        <Pressable onPress={() => setParts(ps => [...ps, { spirit: Math.max(0, MIX_SPIRITS.findIndex((_, k) => !ps.some(p => p.spirit === k))), double: false }])} style={styles.add} accessibilityRole="button">
          <Text style={styles.addTxt}>+ Add another spirit</Text>
        </Pressable>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.label}>MIXER · {MIXER_ML} ML</Text>
        <View style={styles.chips}>
          {MIXERS.map((m, k) => <Chip key={m.name} label={m.name} on={mixer === k} onPress={() => setMixer(k)} />)}
          <Chip label="None" on={mixer == null} onPress={() => setMixer(null)} />
        </View>
      </View>

      <View style={[styles.result, warn?.color === colors.bad && { borderColor: '#7a2234' }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.sub}>{size}</Text>
          <Text style={styles.sub}>{spec.ml} ml · {spec.abv}% · {std.toFixed(1)} std{showCalories ? ` · ${made.kcal} kcal` : ''}</Text>
          {warn ? <Text style={[styles.warn, { color: warn.color }]}>⚠ {warn.text}</Text> : null}
        </View>
        <Text style={styles.hp}>{hpText(p)}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <PixelButton label="Log it" primary flex={1} onPress={() => onLog(spec)} />
        <PixelButton label="Save & log" flex={1}
          onPress={() => onSaveAndLog({ id: newId, name, size, ml: spec.ml, abv: spec.abv, category: 'mixed', kcal: made.kcal }, spec)} />
      </View>
      <Text style={styles.hint}>Save & log adds it to My drinks for one-tap logging next time. Add a price there with ✎.</Text>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  back: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mana },
  h: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  block: { gap: 8, backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.edge, padding: 10 },
  blockHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 0.6, color: colors.inkDim },
  remove: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.bad },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi },
  chipOn: { backgroundColor: colors.gold, borderColor: '#ffe39a' },
  chipTxt: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.inkDim },
  chipTxtOn: { color: colors.edge },
  add: { paddingVertical: 10, alignItems: 'center', borderWidth: 2, borderColor: colors.edgeHi, borderStyle: 'dashed' },
  addTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.gold, padding: 12 },
  name: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkDim },
  warn: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  hp: { fontFamily: fonts.num, fontSize: 24, color: '#ff6a6f' },
  hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint },
}));
