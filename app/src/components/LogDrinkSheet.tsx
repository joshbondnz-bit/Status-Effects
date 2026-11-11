// The "+ Drink" sheet: presets and My drinks, each showing the HP it would cost before you log it,
// plus a form for custom drinks (with prices and packs).
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PRESETS, REGIONS, alcoholGrams, makeDrink, previewDrink,
  type DrinkCategory, type DrinkPreview, type DrinkSpec, type LogEvent, type Profile, type RegionCode,
} from '../../../engine/src/index.ts';
import { savedToSpec, type SavedDrink } from '../storage';
import { useColors, makeStyles, type Palette, fonts } from '../theme';
import { money } from '../format';
import { DrinkForm } from './DrinkForm';
import { hpText, zoneWarning } from './PreviewLine';
import { PixelButton } from './Form';

type Tab = DrinkCategory | 'mine';

const TABS: { key: DrinkCategory; label: string }[] = [
  { key: 'beer', label: 'Beer & cider' },
  { key: 'wine', label: 'Wine' },
  { key: 'spirits', label: 'Spirits' },
  { key: 'mixed', label: 'Mixed' },
];

interface Props {
  visible: boolean;
  region: RegionCode;
  highRange: boolean;
  showCalories: boolean;
  /** Tonight so far, so each drink can show what it would do. */
  profile: Profile;
  events: LogEvent[];
  now: number;
  myDrinks: SavedDrink[];
  onClose: () => void;
  onPick: (spec: DrinkSpec) => void;
  onSaveDrink: (d: SavedDrink) => void;
  onDeleteDrink: (id: string) => void;
}

type Form = { mode: 'new' | 'edit'; initial: Partial<SavedDrink> } | null;

export function LogDrinkSheet(props: Props) {
  const colors = useColors();
  const styles = useStyles(colors);
  const { visible, region, highRange, showCalories, profile, events, now, myDrinks, onClose, onPick, onSaveDrink, onDeleteDrink } = props;
  const [tab, setTab] = useState<Tab>(myDrinks.length ? 'mine' : 'beer');
  const [form, setForm] = useState<Form>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const g = REGIONS[region].gramsPerStandardDrink;

  // Each time the sheet opens, start on the list (My drinks first if there are any).
  useEffect(() => { if (visible) { setForm(null); setRestock(null); setTab(myDrinks.length ? 'mine' : 'beer'); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'mine' && !myDrinks.length) setTab('beer'); }, [tab, myDrinks.length]);

  const rows: { key: string; spec: DrinkSpec; saved?: SavedDrink }[] = tab === 'mine'
    ? myDrinks.map(d => ({ key: d.id, spec: savedToSpec(d), saved: d }))
    : PRESETS[tab].map((p, i) => ({ key: tab + i, spec: p }));

  const preview = (spec: DrinkSpec) => previewDrink(profile, events, now, spec);
  const previews = useMemo(() => (visible && !form ? rows.map(r => preview(r.spec)) : []),
    [visible, form, tab, myDrinks, events, profile, Math.floor(now / 60_000)]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { setForm(null); setRestock(null); onClose(); };

  // Packs with "count what's left": each log uses one; at 0, ask whether another pack was bought.
  const [restock, setRestock] = useState<SavedDrink | null>(null);
  const pickRow = (spec: DrinkSpec, saved?: SavedDrink) => {
    if (saved?.left == null) return onPick(spec);
    if (saved.left > 0) { onSaveDrink({ ...saved, left: saved.left - 1 }); return onPick(spec); }
    setRestock(saved);
  };
  const packCount = restock?.price?.per === 'pack' ? restock.price.count : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom, maxHeight: height * 0.88 }]}>
          <View style={styles.head}>
            <Text style={styles.title}>Log a drink</Text>
            <Pressable onPress={close} style={styles.x} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.xTxt}>×</Text>
            </Pressable>
          </View>
          {highRange ? <Text style={styles.warn}>You're already in a high range. Water might be the better pick right now.</Text> : null}

          {restock && !form ? (
            <View style={styles.restock}>
              <Text style={styles.restockTitle}>That was your last {restock.name}</Text>
              <Text style={styles.hint}>Did you buy another pack?</Text>
              <PixelButton primary label={`Yes, ${packCount} for ${money(restock.price!.amount)}`} onPress={() => {
                const spec = savedToSpec(restock);
                onSaveDrink({ ...restock, left: packCount - 1 }); setRestock(null); onPick(spec);
              }} />
              <PixelButton label="Yes, but a different price" onPress={() => { setForm({ mode: 'edit', initial: { ...restock, left: packCount } }); setRestock(null); }} />
              <PixelButton label="Log it without counting" onPress={() => { const spec = savedToSpec(restock); setRestock(null); onPick(spec); }} />
              <Pressable onPress={() => setRestock(null)} accessibilityRole="button"><Text style={styles.back}>‹ Back to drinks</Text></Pressable>
            </View>
          ) : form ? (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
              <DrinkForm key={form.initial.id ?? form.initial.name ?? 'new'} mode={form.mode} initial={form.initial} region={region} showCalories={showCalories}
                preview={preview} onBack={() => setForm(null)}
                onLog={(spec, save) => { if (save) onSaveDrink(save); setForm(null); onPick(spec); }}
                onSave={d => { onSaveDrink(d); setForm(null); setTab('mine'); }}
                onDelete={id => { onDeleteDrink(id); setForm(null); }} />
            </ScrollView>
          ) : (
            <>
              <View style={styles.tabs}>
                {myDrinks.length ? <TabBtn label="My drinks" on={tab === 'mine'} onPress={() => setTab('mine')} /> : null}
                {TABS.map(t => <TabBtn key={t.key} label={t.label} on={tab === t.key} onPress={() => setTab(t.key)} />)}
              </View>
              <Text style={styles.note}>Red numbers are the HP each drink would take once it's absorbed.</Text>
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 6 }}>
                {rows.map((r, i) => (
                  <DrinkRow key={r.key} spec={r.spec} p={previews[i]} std={alcoholGrams(r.spec.ml, r.spec.abv) / g} showCalories={showCalories}
                    left={r.saved?.left} onPress={() => pickRow(r.spec, r.saved)}
                    onEdit={() => setForm(r.saved
                      ? { mode: 'edit', initial: r.saved }
                      : { mode: 'new', initial: { name: r.spec.name, size: r.spec.size, ml: r.spec.ml, abv: r.spec.abv, category: r.spec.category } })}
                    editLabel={r.saved ? 'Edit' : 'Customise'} />
                ))}
              </ScrollView>
              <Pressable onPress={() => setForm({ mode: 'new', initial: { category: tab === 'mine' ? 'beer' : tab } })} style={styles.custom} accessibilityRole="button">
                <Text style={styles.customTxt}>+ Custom drink</Text>
              </Pressable>
              <Text style={styles.hint}>Tap a drink to log it. Use ✎ to save your own version with a price.</Text>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TabBtn({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <Pressable onPress={onPress} style={[styles.tab, on && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
      <Text style={[styles.tabTxt, on && styles.tabTxtOn]}>{label}</Text>
    </Pressable>
  );
}

function DrinkRow({ spec, p, std, showCalories, left, onPress, onEdit, editLabel }: {
  spec: DrinkSpec; p?: DrinkPreview; std: number; showCalories: boolean; left?: number; onPress: () => void; onEdit: () => void; editLabel: string;
}) {
  const colors = useColors();
  const styles = useStyles(colors);
  const warn = p ? zoneWarning(p, colors) : null;
  const kcal = showCalories ? makeDrink(spec, 0, 'x').kcal : null;
  const details = [`${std.toFixed(1)} std`, kcal != null ? `${kcal} kcal` : null, spec.cost != null ? money(spec.cost) : null].filter(Boolean).join(' · ');
  return (
    <View style={[styles.preset, warn?.color === colors.bad && styles.presetBad]}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.presetMain, pressed && { opacity: 0.7 }]} accessibilityRole="button"
        accessibilityLabel={`Log ${spec.name}${spec.size ? ', ' + spec.size : ''}${p ? `, about ${Math.round(p.hpLoss)} HP` : ''}${warn ? ', ' + warn.text : ''}`}>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={styles.pName}>{spec.name}</Text>
          <Text style={styles.pSub}>
            {spec.size ? `${spec.size} · ` : ''}{spec.ml} ml · {spec.abv}%
            {left != null ? <Text style={[styles.left, left === 0 && { color: colors.warn }]}>{'  '}{left === 0 ? 'none left' : `${left} left`}</Text> : null}
          </Text>
          {warn ? <Text style={[styles.pWarn, { color: warn.color }]}>⚠ {warn.text}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 1 }}>
          {p ? <Text style={styles.pHp}>{hpText(p)}</Text> : null}
          <Text style={styles.pSub}>{details}</Text>
        </View>
      </Pressable>
      <Pressable onPress={onEdit} style={styles.edit} accessibilityRole="button" accessibilityLabel={`${editLabel} ${spec.name}`} hitSlop={6}>
        <Text style={styles.editTxt}>✎</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(9,7,14,0.78)' },
  sheet: { backgroundColor: colors.panel, borderTopWidth: 3, borderColor: colors.edgeHi, padding: 16, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.display, fontSize: 34, letterSpacing: 0.4, color: colors.ink },
  x: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi },
  xTxt: { color: colors.ink, fontSize: 20 },
  warn: { fontFamily: fonts.body, fontSize: 14, color: colors.alertInk, backgroundColor: colors.alertBg, borderWidth: 2, borderColor: colors.alertEdge, padding: 10 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tab: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi },
  tabOn: { backgroundColor: colors.gold, borderColor: '#ffe39a' },
  tabTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkDim },
  tabTxtOn: { color: colors.edge },
  note: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint },
  preset: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.edge },
  presetBad: { borderColor: '#7a2234' },
  presetMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  pName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  pSub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkDim },
  pWarn: { fontFamily: fonts.bodyBold, fontSize: 12.5, marginTop: 2 },
  pHp: { fontFamily: fonts.num, fontSize: 22, color: '#ff6a6f', lineHeight: 22 },
  edit: { width: 44, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 2, borderLeftColor: colors.edge },
  editTxt: { fontSize: 17, color: colors.inkDim },
  custom: { paddingVertical: 11, alignItems: 'center', backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi, borderStyle: 'dashed' },
  customTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint },
  left: { fontFamily: fonts.bodyBold, color: colors.gold },
  restock: { gap: 10, paddingVertical: 4 },
  restockTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  back: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mana, textAlign: 'center', paddingVertical: 6 },
}));
