import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRESETS, REGIONS, alcoholGrams, makeDrink, type DrinkCategory, type DrinkSpec, type RegionCode } from '../../../engine/src/index.ts';
import { colors, fonts } from '../theme';

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
  onClose: () => void;
  onPick: (spec: DrinkSpec) => void;
}

export function LogDrinkSheet({ visible, region, highRange, onClose, onPick }: Props) {
  const [tab, setTab] = useState<DrinkCategory>('beer');
  const insets = useSafeAreaInsets();
  const g = REGIONS[region].gramsPerStandardDrink;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.head}>
          <Text style={styles.title}>Log a drink</Text>
          <Pressable onPress={onClose} style={styles.x} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.xTxt}>×</Text>
          </Pressable>
        </View>
        {highRange ? <Text style={styles.warn}>You're already in a high range. Water might be the better pick right now.</Text> : null}
        <View style={styles.tabs}>
          {TABS.map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key }}>
              <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 6 }}>
          {PRESETS[tab].map((p, i) => {
            const d = makeDrink(p, 0, 'preview');
            return (
              <Pressable key={i} onPress={() => onPick(p)} style={({ pressed }) => [styles.preset, pressed && { borderColor: colors.gold }]} accessibilityRole="button">
                <View style={{ flex: 1 }}>
                  <Text style={styles.pName}>{p.name}</Text>
                  <Text style={styles.pSub}>{p.size} · {p.ml} ml · {p.abv}%</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.pQty}>{(alcoholGrams(p.ml, p.abv) / g).toFixed(1)} std</Text>
                  <Text style={styles.pSub}>{d.kcal} kcal</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.soon}>Custom drinks, My drinks, prices and barcode scanning come next.</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(9,7,14,0.78)' },
  sheet: { backgroundColor: colors.panel, borderTopWidth: 3, borderColor: colors.edgeHi, padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  x: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi },
  xTxt: { color: colors.ink, fontSize: 20 },
  warn: { fontFamily: fonts.body, fontSize: 14, color: colors.alertInk, backgroundColor: colors.alertBg, borderWidth: 2, borderColor: colors.alertEdge, padding: 10 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tab: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi },
  tabOn: { backgroundColor: colors.gold, borderColor: '#ffe39a' },
  tabTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkDim },
  tabTxtOn: { color: colors.edge },
  preset: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.edge },
  pName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  pSub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkDim },
  pQty: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  soon: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint },
});
