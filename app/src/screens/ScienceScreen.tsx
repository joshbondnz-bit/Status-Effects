// The Science tab: how the numbers are worked out, where each effect comes from, and what the app isn't.
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { PixelSprite } from '../components/PixelSprite';
import { ICONS, type SpriteDef } from '../sprites';
import { useColors, makeStyles, type Palette, fonts, panelStyles } from '../theme';
import { useApp } from '../AppDataProvider';
import { EMERGENCY } from '../components/SafetyCheck';

const METHOD: [string, string][] = [
  ['Blood alcohol (BAC)', 'Shown as a percentage: grams of alcohol per 100 ml of blood. In Canada, 0.08% is the criminal driving limit and most provinces issue roadside suspensions from 0.05%.'],
  ['Canadian standard drink', '13.45 g of alcohol: a 341 ml bottle of 5% beer, a 142 ml glass of 12% wine, or a 43 ml (1.5 oz) shot of 40% spirits.'],
  ['Grams, not drinks', 'Each drink becomes grams of alcohol: ml × ABV × 0.789. Standard drinks are shown for your region.'],
  ['Absorption', 'On an empty stomach a drink peaks in about 30–45 minutes. Food in the last 3 hours slows that to 60–90 minutes and cuts how much reaches your blood by about 15%.'],
  ['Your body', 'Your weight, height, age and sex estimate your body water, which sets how far each drink is diluted.'],
  ['Fixed recovery', 'Blood alcohol falls about 0.015% an hour. Water, coffee, food and sleep don’t speed that up; only time does.'],
  ['The HP ring', 'Six equal segments between 0.02, 0.05, 0.08, 0.11, 0.15 and 0.25%, so early drinks are visible. 0 HP is 0.25%, where the risk of alcohol poisoning becomes serious. The drain rate is what you’ll lose over the next hour, heaviest while drinks absorb.'],
  ['Next-day debuffs', 'Worked out from your total grams per kg of body weight, your peak, and how much alcohol is still in your system at bedtime.'],
  ['Calories', '7 kcal per gram of alcohol plus 4 per gram of sugars and carbs. Your daily needs are estimated from your character sheet at a light activity level.'],
];

type Ref = { icon: keyof typeof ICONS; name: string; text: string; source: string };
const REFS: Ref[] = [
  { icon: 'judgment', name: 'Impaired judgment', text: 'Reaction time, coordination and risk judgment worsen from low levels, well before the legal limits.', source: 'Criminal Code of Canada (0.08%) · provincial roadside limits (0.05%)' },
  { icon: 'sleep', name: 'Impaired sleep', text: 'Alcohol still in your system at bedtime suppresses REM sleep and breaks up the second half of the night, more so at higher doses.', source: 'Ebrahim et al., 2013, Alcoholism: Clinical and Experimental Research' },
  { icon: 'hrv', name: 'HRV drain', text: 'Heart-rate variability is the small variation between heartbeats; higher overnight means better recovery. It fell about 9%, 24% and 39% at low, moderate and high intake per kg of body weight.', source: 'Pietilä et al., 2018, JMIR Mental Health' },
  { icon: 'hangover', name: 'Hangover', text: 'Hangovers peak as blood alcohol returns to zero and become much more common after a peak above about 0.11%.', source: 'Verster and colleagues, Alcohol Hangover Research Group' },
  { icon: 'dehydration', name: 'Dehydration', text: 'Alcohol suppresses vasopressin, the hormone that helps your kidneys hold onto water.', source: 'Hobson and Maughan, 2010, Alcohol and Alcoholism' },
  { icon: 'hangxiety', name: 'Hangxiety', text: 'Next-day anxiety and low mood as the brain rebounds from alcohol’s calming effect.', source: 'Marsh et al., 2019, Personality and Individual Differences' },
  { icon: 'recovery', name: 'Slow recovery', text: 'Heavy drinking after exercise cut muscle protein synthesis by roughly a quarter to a third.', source: 'Parr et al., 2014, PLoS One' },
  { icon: 'fatpause', name: 'Fat burning paused', text: 'The body clears alcohol first; whole-body fat burning dropped sharply after a moderate dose.', source: 'Siler et al., 1999, American Journal of Clinical Nutrition' },
  { icon: 'munchies', name: 'Munchies', text: 'Alcohol increases appetite and how much you eat at the next meal, often called the apéritif effect.', source: 'Yeomans, 2010, Physiology and Behavior' },
  { icon: 'strain', name: 'Body under strain', text: 'Around 0.25% and above, the risk of alcohol poisoning rises steeply: vomiting while drowsy, choking, slowed breathing.', source: 'US National Institute on Alcohol Abuse and Alcoholism, Understanding the Dangers of Alcohol Overdose' },
  { icon: 'lined', name: 'Well fed', text: 'Food in your stomach slows absorption, giving a lower, later peak. It doesn’t speed up how fast alcohol clears.', source: 'Jones and Jönsson, 1994, Journal of Forensic Sciences' },
  { icon: 'hydrated', name: 'Hydrated', text: 'Water offsets fluid loss and spaces out your drinks. It doesn’t lower blood alcohol.', source: 'Hobson and Maughan, 2010, Alcohol and Alcoholism' },
];

const MODEL_SOURCES = 'Watson et al., 1980, American Journal of Clinical Nutrition (body water) · Jones, 2010, Forensic Science International (elimination) · Jones and Jönsson, 1994, Journal of Forensic Sciences (food) · Mifflin et al., 1990, American Journal of Clinical Nutrition (daily calories)';

export function ScienceScreen() {
  const colors = useColors();
  const styles = useStyles(colors);
  const { panel } = panelStyles(colors);
  const { data } = useApp();
  return (
    <Screen>
      <Text style={styles.h1}>The science</Text>
      <Text style={styles.lead}>Status Effects turns what you log into estimates. Here’s how, and where each effect comes from.</Text>

      <View style={[panel, styles.card]}>
        <Text style={styles.h2}>How the numbers work</Text>
        {METHOD.map(([title, body]) => (
          <Text key={title} style={styles.body}><Text style={styles.bold}>{title}. </Text>{body}</Text>
        ))}
        <Text style={styles.source}>{MODEL_SOURCES}</Text>
      </View>

      <View style={[panel, styles.card]}>
        <Text style={styles.h2}>Where each effect comes from</Text>
        {REFS.map(r => (
          <View key={r.name} style={styles.ref}>
            <View style={styles.icon}><PixelSprite sprite={ICONS[r.icon] as SpriteDef} scale={2} /></View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.bold}>{r.name}</Text>
              <Text style={styles.body}>{r.text}</Text>
              <Text style={styles.source}>{r.source}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[panel, styles.card]}>
        <Text style={styles.h2}>Canada’s guidance</Text>
        <Text style={styles.body}>Risk rises with every drink. Per week: <Text style={styles.bold}>2 or fewer</Text> standard drinks is low risk, <Text style={styles.bold}>3 to 6</Text> moderate, and <Text style={styles.bold}>7 or more</Text> increasingly high. On any one occasion, no more than 2.</Text>
        <Text style={styles.source}>Canada’s Guidance on Alcohol and Health, Canadian Centre on Substance Use and Addiction (CCSA), 2023</Text>
      </View>

      <View style={[panel, styles.card]}>
        <Text style={styles.h2}>What this app isn’t</Text>
        <Text style={styles.body}>Every number is an estimate from population averages, not a measurement of you. Status Effects isn’t a breathalyser or medical advice, and it never tells you you’re safe to drive. If you or someone else shows signs of alcohol poisoning, call {EMERGENCY[data.profile.region]}.</Text>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  h1: { fontFamily: fonts.display, fontSize: 44, letterSpacing: 0.4, color: colors.ink },
  lead: { fontFamily: fonts.body, fontSize: 15, color: colors.inkDim, lineHeight: 21 },
  card: { padding: 14, gap: 12 },
  h2: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 0.4, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 14.5, color: colors.inkDim, lineHeight: 21 },
  bold: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 15 },
  source: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint, lineHeight: 18 },
  ref: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingTop: 10, borderTopWidth: 2, borderTopColor: colors.edgeHi },
  icon: { width: 36, alignItems: 'center', paddingTop: 2 },
}));
