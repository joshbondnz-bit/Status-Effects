import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import type { Profile } from '../../../engine/src/index.ts';
import { useApp } from '../AppDataProvider';
import { CharacterFields, RoutineFields } from '../components/ProfileFields';
import { Field, PixelButton, Segmented, ToggleRow } from '../components/Form';
import type { FoodCompare } from '../storage';
import { colors, fonts, panel } from '../theme';

export function OptionsScreen() {
  const { data, update } = useApp();
  const [confirmReplay, setConfirmReplay] = useState(false);

  // Every change saves immediately. Editing your stats also counts as finishing setup.
  const setProfile = (patch: Partial<Profile>) =>
    update(d => ({ ...d, profile: { ...d.profile, ...patch }, setup: d.setup === 'skipped' ? 'done' : d.setup }));

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Options</Text>

      {data.setup === 'skipped' ? (
        <Text style={styles.nudge}>You're using the default character. Fill in your stats below so the health bar matches your body.</Text>
      ) : null}

      <View style={[panel, styles.card]}>
        <Text style={styles.h2}>Character sheet</Text>
        <Text style={styles.lead}>Your stats decide how far each drink spreads through your body, which sets how fast your health bar drops.</Text>
        <CharacterFields profile={data.profile} units={data.settings.units} onChange={setProfile}
          onUnits={units => update(d => ({ ...d, settings: { ...d.settings, units } }))} />
      </View>

      <View style={[panel, styles.card]}>
        <Text style={styles.h2}>Routine and guidelines</Text>
        <RoutineFields profile={data.profile} onChange={setProfile} />
      </View>

      <View style={[panel, styles.card]}>
        <Text style={styles.h2}>Calories</Text>
        <ToggleRow value={data.settings.calories} onChange={calories => update(d => ({ ...d, settings: { ...d.settings, calories } }))}
          title="Show calories and food-related debuffs"
          body="Some people find calorie tracking unhelpful, so this stays optional." />
        {data.settings.calories ? (
          <Field label="Compare calories with">
            <Segmented<FoodCompare> label="Compare calories with" value={data.settings.compareWith ?? 'pizza'}
              onChange={compareWith => update(d => ({ ...d, settings: { ...d.settings, compareWith } }))}
              options={[{ value: 'pizza', label: 'Pizza slices' }, { value: 'doughnut', label: 'Doughnuts' }, { value: 'burger', label: 'Burgers' }]} />
          </Field>
        ) : null}
      </View>

      <View style={[panel, styles.card]}>
        <Text style={styles.h2}>Setup</Text>
        {confirmReplay ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.lead}>Run the first-time setup again? Your stats are kept as the starting values and your log isn't touched.</Text>
            <View style={styles.row}>
              <PixelButton label="Run setup" primary flex={1} onPress={() => update(d => ({ ...d, setup: 'pending' }))} />
              <PixelButton label="Cancel" flex={1} onPress={() => setConfirmReplay(false)} />
            </View>
          </View>
        ) : (
          <PixelButton label="Run first-time setup again" onPress={() => setConfirmReplay(true)} />
        )}
      </View>

      <Text style={styles.fine}>Everything is saved on this device only.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
  h1: { fontFamily: fonts.displayBold, fontSize: 44, letterSpacing: 0.4, color: colors.ink },
  h2: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 0.4, color: colors.ink },
  card: { padding: 14, gap: 14 },
  lead: { fontFamily: fonts.body, fontSize: 14, color: colors.inkDim, lineHeight: 20 },
  nudge: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, backgroundColor: '#3a3220', borderWidth: 2, borderColor: '#6a5424', padding: 12, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 8 },
  fine: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint, textAlign: 'center' },
});
