// The character sheet and routine fields, used by first-run setup and Options.
import { StyleSheet, View } from 'react-native';
import type { Profile, RegionCode, Sex } from '../../../engine/src/index.ts';
import type { Units } from '../storage';
import { Field, NumberInput, Segmented, TimeStepper } from './Form';
import { LIMITS, clamp, cmToFtIn, ftInToCm, kgToLb, lbToKg } from '../units';

type Change = (patch: Partial<Profile>) => void;

export function CharacterFields({ profile, units, onChange, onUnits }: { profile: Profile; units: Units; onChange: Change; onUnits: (u: Units) => void }) {
  const imperial = units === 'imperial';
  const { ft, inch } = cmToFtIn(profile.heightCm);
  return (
    <View style={styles.wrap}>
      <Field label="Units">
        <Segmented<Units> label="Units" value={units} onChange={onUnits}
          options={[{ value: 'imperial', label: 'lb · ft/in' }, { value: 'metric', label: 'kg · cm' }]} />
      </Field>
      <View style={styles.row}>
        <Field label="Weight">
          {imperial
            ? <NumberInput label="Weight in pounds" suffix="lb" value={kgToLb(profile.weightKg)} min={kgToLb(LIMITS.weightKg[0])} max={kgToLb(LIMITS.weightKg[1])}
                onChange={lb => onChange({ weightKg: clamp(lbToKg(lb), [1, LIMITS.weightKg[1]]) })} />
            : <NumberInput label="Weight in kilograms" suffix="kg" value={profile.weightKg} min={LIMITS.weightKg[0]} max={LIMITS.weightKg[1]}
                onChange={kg => onChange({ weightKg: clamp(kg, [1, LIMITS.weightKg[1]]) })} />}
        </Field>
        <Field label="Age">
          <NumberInput label="Age" value={profile.age} min={LIMITS.age[0]} max={LIMITS.age[1]} onChange={a => onChange({ age: Math.round(a) })} />
        </Field>
      </View>
      <Field label="Height">
        {imperial ? (
          <View style={styles.row2}>
            <View style={styles.half}>
              <NumberInput label="Height, feet" suffix="ft" value={ft} min={3} max={7}
                onChange={f => onChange({ heightCm: clamp(ftInToCm(Math.round(f), inch), LIMITS.heightCm) })} />
            </View>
            <View style={styles.half}>
              <NumberInput label="Height, inches" suffix="in" value={inch} min={0} max={11}
                onChange={i => onChange({ heightCm: clamp(ftInToCm(ft, Math.min(11, Math.round(i))), LIMITS.heightCm) })} />
            </View>
          </View>
        ) : (
          <NumberInput label="Height in centimetres" suffix="cm" value={profile.heightCm} min={LIMITS.heightCm[0]} max={LIMITS.heightCm[1]}
            onChange={cm => onChange({ heightCm: clamp(cm, [1, LIMITS.heightCm[1]]) })} />
        )}
      </Field>
      <View style={styles.row}>
        <Field label="Body-water formula" hint="Only used to estimate body water. Pick whichever is closer to your body composition.">
          <Segmented<Sex> label="Body-water formula" value={profile.sex} onChange={sex => onChange({ sex })}
            options={[{ value: 'm', label: 'Male' }, { value: 'f', label: 'Female' }]} />
        </Field>
      </View>
    </View>
  );
}

export function RoutineFields({ profile, onChange }: { profile: Profile; onChange: Change }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.row, styles.times]}>
        <Field label="Usual bedtime" minWidth={180}>
          <TimeStepper label="Bedtime" value={profile.bedtime} onChange={bedtime => onChange({ bedtime })} />
        </Field>
        <Field label="Usual wake time" minWidth={180}>
          <TimeStepper label="Wake time" value={profile.wakeTime} onChange={wakeTime => onChange({ wakeTime })} />
        </Field>
      </View>
      <Field label="Guidelines" hint="Sets what a standard drink is and which drinking guidance the app compares you to.">
        <Segmented<RegionCode> label="Guidelines" value={profile.region} onChange={region => onChange({ region })}
          options={[
            { value: 'ca', label: 'Canada' }, { value: 'us', label: 'US' }, { value: 'uk', label: 'UK' },
            { value: 'au', label: 'Australia' }, { value: 'nz', label: 'NZ' }, { value: 'eu', label: 'Europe' },
          ]} />
      </Field>
    </View>
  );
}

/** Weight, height and age all filled in and within range. */
export function profileComplete(p: Profile): boolean {
  return p.weightKg >= LIMITS.weightKg[0] && p.weightKg <= LIMITS.weightKg[1]
    && p.heightCm >= LIMITS.heightCm[0] && p.heightCm <= LIMITS.heightCm[1]
    && p.age >= LIMITS.age[0] && p.age <= LIMITS.age[1];
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  row2: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, minWidth: 0 },
  // Each time control needs ~170px; on narrow phones they stack instead of colliding.
  times: { rowGap: 14 },
});
