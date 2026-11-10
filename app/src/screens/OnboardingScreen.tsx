import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import type { Profile } from '../../../engine/src/index.ts';
import { useApp } from '../AppDataProvider';
import { CharacterFields, RoutineFields, profileComplete } from '../components/ProfileFields';
import { PixelButton, ToggleRow } from '../components/Form';
import { PixelSprite } from '../components/PixelSprite';
import { HEART } from '../sprites';
import type { Settings } from '../storage';
import { colors, fonts, panel } from '../theme';

/** Two-step first-run setup: your character, then your routine. Nothing is saved until you finish or skip. */
export function OnboardingScreen() {
  const { data, update } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const [profile, setProfile] = useState<Profile>(data.profile);
  const [settings, setSettings] = useState<Settings>(data.settings);
  const [showError, setShowError] = useState(false);
  const patch = (p: Partial<Profile>) => setProfile(prev => ({ ...prev, ...p }));

  const next = () => {
    if (!profileComplete(profile)) { setShowError(true); return; }
    setShowError(false); setStep(2);
  };
  const finish = () => update(d => ({ ...d, profile, settings, setup: 'done' }));
  const skip = () => update(d => ({ ...d, setup: d.setup === 'done' ? 'done' : 'skipped' }));

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <View style={[panel, styles.card]}>
        <View style={styles.head}>
          <PixelSprite sprite={HEART} scale={5} />
          <View style={{ flex: 1 }}>
            <Text style={styles.step}>STEP {step} OF 2</Text>
            <Text style={styles.title}>{step === 1 ? 'Create your character' : 'Your routine'}</Text>
          </View>
        </View>
        <View style={styles.pips} accessibilityElementsHidden>
          <View style={[styles.pip, styles.pipOn]} />
          <View style={[styles.pip, step === 2 && styles.pipOn]} />
        </View>

        {step === 1 ? (
          <>
            <Text style={styles.lead}>Your stats decide how far each drink spreads through your body, which sets how fast your health bar drops. They stay on this device.</Text>
            <CharacterFields profile={profile} units={settings.units} onChange={patch} onUnits={units => setSettings(s => ({ ...s, units }))} />
            {showError ? <Text style={styles.error}>Check your weight, height and age, or skip for now.</Text> : null}
            <View style={styles.row}>
              <PixelButton label="Next" primary flex={1} onPress={next} />
              <PixelButton label="Skip for now" flex={1} onPress={skip} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.lead}>Your sleep window drives the sleep debuff and when your morning-after report arrives.</Text>
            <RoutineFields profile={profile} onChange={patch} />
            <ToggleRow value={settings.calories} onChange={calories => setSettings(s => ({ ...s, calories }))}
              title="Show calories and food-related debuffs" body="You can turn this off any time in Options." />
            <View style={styles.row}>
              <PixelButton label="Start the night" primary flex={1} onPress={finish} />
              <PixelButton label="Back" flex={1} onPress={() => setStep(1)} />
            </View>
          </>
        )}
        <Text style={styles.fine}>For people of legal drinking age. Every number is an estimate and never a driving clearance. You can change all of this later in Options.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
  card: { padding: 16, gap: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 0.6, color: colors.inkDim },
  title: { fontFamily: fonts.displayBold, fontSize: 38, letterSpacing: 0.4, color: colors.ink },
  pips: { flexDirection: 'row', gap: 6 },
  pip: { flex: 1, height: 6, backgroundColor: colors.sunk, borderWidth: 1, borderColor: colors.edgeHi },
  pipOn: { backgroundColor: colors.hp, borderColor: colors.hp },
  lead: { fontFamily: fonts.body, fontSize: 14, color: colors.inkDim, lineHeight: 20 },
  error: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.bad },
  row: { flexDirection: 'row', gap: 8 },
  fine: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint, lineHeight: 18 },
});
