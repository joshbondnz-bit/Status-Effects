import { useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import type { Profile } from '../../../engine/src/index.ts';
import { useApp } from '../AppDataProvider';
import { CharacterFields, NameField, RoutineFields, profileComplete } from '../components/ProfileFields';
import { PixelButton, ToggleRow } from '../components/Form';
import { PixelSprite } from '../components/PixelSprite';
import { EMERGENCY } from '../components/SafetyCheck';
import { HEART, ICONS } from '../sprites';
import type { Settings } from '../storage';
import { useColors, makeStyles, type Palette, fonts, panelStyles } from '../theme';

/**
 * First-run setup: your character, your routine, then a safety screen to acknowledge.
 * Nothing is saved until "I understand". Skipping the first two steps still shows the safety screen,
 * and people who set up before it existed see just that screen, once.
 */
export function OnboardingScreen() {
  const colors = useColors();
  const styles = useStyles(colors);
  const { panel } = panelStyles(colors);
  const { data, update } = useApp();
  const onlySafety = data.setup !== 'pending';
  const [step, setStep] = useState<1 | 2 | 3>(onlySafety ? 3 : 1);
  const [skipped, setSkipped] = useState(false);
  const [profile, setProfile] = useState<Profile>(data.profile);
  const [settings, setSettings] = useState<Settings>(data.settings);
  const [showError, setShowError] = useState(false);
  const patch = (p: Partial<Profile>) => setProfile(prev => ({ ...prev, ...p }));

  const next = () => {
    if (!profileComplete(profile)) { setShowError(true); return; }
    setShowError(false); setStep(2);
  };
  const skip = () => { setSkipped(true); setStep(3); };
  const acknowledge = () => update(d => onlySafety
    ? { ...d, safetyAckAt: Date.now() }
    : skipped
      ? { ...d, setup: 'skipped', settings: { ...d.settings, name: settings.name }, safetyAckAt: Date.now() }
      : { ...d, profile, settings, setup: 'done', safetyAckAt: Date.now() });

  const region = (skipped || onlySafety ? data.profile : profile).region;
  const titles = { 1: 'Create your character', 2: 'Your routine', 3: 'Before you start' } as const;

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <View style={[panel, styles.card]}>
        <View style={styles.head}>
          <PixelSprite sprite={HEART} scale={5} />
          <View style={{ flex: 1 }}>
            <Text style={styles.step}>{onlySafety ? 'ONE LAST THING' : `STEP ${step} OF 3`}</Text>
            <Text style={styles.title}>{titles[step]}</Text>
          </View>
        </View>
        {!onlySafety ? (
          <View style={styles.pips} accessibilityElementsHidden>
            {[1, 2, 3].map(i => <View key={i} style={[styles.pip, step >= i && styles.pipOn]} />)}
          </View>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={styles.lead}>Your stats decide how far each drink spreads through your body, which sets how fast your health bar drops. They stay on this device.</Text>
            <NameField value={settings.name ?? ''} onChange={name => setSettings(s => ({ ...s, name: name || undefined }))} />
            <CharacterFields profile={profile} units={settings.units} onChange={patch} onUnits={units => setSettings(s => ({ ...s, units }))} />
            {showError ? <Text style={styles.error}>Check your weight, height and age, or skip for now.</Text> : null}
            <View style={styles.row}>
              <PixelButton label="Next" primary flex={1} onPress={next} />
              <PixelButton label="Skip for now" flex={1} onPress={skip} />
            </View>
          </>
        ) : step === 2 ? (
          <>
            <Text style={styles.lead}>Your sleep window drives the sleep debuff and when your morning-after report arrives.</Text>
            <RoutineFields profile={profile} onChange={patch} />
            <ToggleRow value={settings.calories} onChange={calories => setSettings(s => ({ ...s, calories }))}
              title="Show calories and food-related debuffs" body="You can turn this off any time in Options." />
            <View style={styles.row}>
              <PixelButton label="Next" primary flex={1} onPress={() => setStep(3)} />
              <PixelButton label="Back" flex={1} onPress={() => setStep(1)} />
            </View>
          </>
        ) : (
          <>
            <Point icon={ICONS.judgment} title="It's an estimate" body="Every number comes from population averages and what you log. It isn't a breathalyser reading or medical advice." />
            <Point icon={ICONS.strain} title="Never drink and drive" body="The app never tells you you're safe to drive. Plan your way home before your first drink: a taxi, rideshare, transit or a sober friend." />
            <Point icon={ICONS.hydrated} title={`In an emergency, call ${EMERGENCY[region]}`}
              body="If someone can't be woken, is breathing slowly or irregularly, or is vomiting while drowsy, call for help and stay with them." />
            <Point icon={ICONS.lined} title="Log it when you get it" body="Logging a drink when it's in your hand shows what it will do before you've had it." />
            <Text style={styles.age}>Status Effects is for people of legal drinking age where they live.</Text>
            <View style={styles.row}>
              <PixelButton label="I understand" primary flex={1} onPress={acknowledge} />
              {!onlySafety ? <PixelButton label="Back" flex={1} onPress={() => setStep(skipped ? 1 : 2)} /> : null}
            </View>
          </>
        )}
        {step !== 3 ? <Text style={styles.fine}>For people of legal drinking age. You can change all of this later in Options.</Text> : null}
      </View>
    </Screen>
  );
}

function Point({ icon, title, body }: { icon: (typeof ICONS)[keyof typeof ICONS]; title: string; body: string }) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <View style={styles.point}>
      <View style={styles.icon}><PixelSprite sprite={icon} scale={2} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.pointTitle}>{title}</Text>
        <Text style={styles.lead}>{body}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
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
  point: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi },
  pointTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  age: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.gold, lineHeight: 19 },
}));
