// Small pixel-styled form controls shared by first-run setup and Options.
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useColors, makeStyles, type Palette, fonts } from '../theme';

/** A labelled form field. `stack` is for fields in a vertical list (so they don't stretch or squash like row items). */
export function Field({ label, children, hint, minWidth = 140, stack }: { label: string; children: ReactNode; hint?: string; minWidth?: number; stack?: boolean }) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <View style={stack ? styles.fieldStack : [styles.field, { minWidth }]}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/**
 * A number box. Calls onChange as you type (whenever the text is a positive number),
 * and clamps to [min, max] when you leave the box.
 */
export function NumberInput({ value, onChange, min, max, suffix, label, decimals = 0 }: {
  value: number; onChange: (n: number) => void; min: number; max: number; suffix?: string; label: string; decimals?: number;
}) {
  const colors = useColors();
  const styles = useStyles(colors);
  const fmt = (n: number) => (decimals ? n.toFixed(decimals) : String(Math.round(n)));
  const [text, setText] = useState(fmt(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(fmt(value)); }, [value, focused]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={styles.inputRow}>
      <TextInput
        value={text}
        accessibilityLabel={label}
        keyboardType="decimal-pad"
        inputMode="decimal"
        onFocus={() => setFocused(true)}
        onChangeText={t => { setText(t); const n = parseFloat(t.replace(',', '.')); if (isFinite(n) && n > 0) onChange(n); }}
        onBlur={() => {
          setFocused(false);
          const n = parseFloat(text.replace(',', '.'));
          const v = isFinite(n) && n > 0 ? Math.min(max, Math.max(min, n)) : value;
          onChange(v); setText(fmt(v));
        }}
        style={styles.input}
        selectTextOnFocus
      />
      {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }}
            style={[styles.segBtn, on && styles.segOn]}>
            <Text style={[styles.segTxt, on && styles.segTxtOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "−  23:30  +" in 15-minute steps. */
export function TimeStepper({ value, onChange, label, step = 15 }: { value: string; onChange: (v: string) => void; label: string; step?: number }) {
  const colors = useColors();
  const styles = useStyles(colors);
  const shift = (m: number) => {
    const [h, mm] = value.split(':').map(Number);
    const t = (((h * 60 + mm + m) % 1440) + 1440) % 1440;
    onChange(String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'));
  };
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => shift(-step)} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel={`${label} ${step} minutes earlier`}>
        <Text style={styles.stepTxt}>−</Text>
      </Pressable>
      <Text style={styles.time} accessibilityLabel={`${label} ${value}`}>{value}</Text>
      <Pressable onPress={() => shift(step)} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel={`${label} ${step} minutes later`}>
        <Text style={styles.stepTxt}>+</Text>
      </Pressable>
    </View>
  );
}

export function ToggleRow({ value, onChange, title, body }: { value: boolean; onChange: (v: boolean) => void; title: string; body: string }) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.toggle} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.hint}>{body}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.gold, false: colors.edgeHi }} thumbColor={colors.ink} />
    </Pressable>
  );
}

export function PixelButton({ label, onPress, primary, flex, disabled }: { label: string; onPress: () => void; primary?: boolean; flex?: number; disabled?: boolean }) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.btn, primary && styles.btnPrimary, flex != null && { flex }, disabled && { opacity: 0.45 }, pressed && { transform: [{ translateY: 2 }] }]}>
      <Text style={[styles.btnTxt, primary && { color: '#fff8ee' }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  field: { gap: 6, flex: 1, minWidth: 140 },
  fieldStack: { gap: 6 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 0.6, color: colors.inkDim, textTransform: 'uppercase' },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minWidth: 0, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi, color: colors.ink, fontFamily: fonts.body, fontSize: 17, paddingHorizontal: 10, paddingVertical: 9 },
  suffix: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkDim },
  seg: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segBtn: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi },
  segOn: { backgroundColor: colors.gold, borderColor: '#ffe39a' },
  segTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkDim },
  segTxtOn: { color: colors.edge },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.edgeHi, borderBottomWidth: 4, borderBottomColor: colors.edge },
  stepTxt: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.ink },
  time: { fontFamily: fonts.num, fontSize: 30, color: colors.ink, minWidth: 74, textAlign: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.sunk, padding: 12 },
  toggleTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  btn: { paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.edgeHi, borderBottomWidth: 5, borderBottomColor: colors.edge },
  btnPrimary: { backgroundColor: colors.hp, borderColor: colors.hpHi, borderBottomColor: colors.hpLo },
  btnTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: 'center' },
}));
