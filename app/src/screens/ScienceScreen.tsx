// The Science tab: how the numbers are worked out, where each effect comes from, and what the app isn't.
// The standard drink, driving limits and drinking guidance follow the region picked in Options.
import { Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { PixelSprite } from '../components/PixelSprite';
import { ICONS, type SpriteDef } from '../sprites';
import { useColors, makeStyles, type Palette, fonts, panelStyles } from '../theme';
import { useApp } from '../AppDataProvider';
import { EMERGENCY } from '../components/SafetyCheck';
import type { RegionCode } from '../../../engine/src/index.ts';

/** What each region means by a standard drink (or UK unit), and its driving limits. */
const LOCAL: Record<RegionCode, { drinkName: string; drink: string; driving: string; law: string }> = {
  ca: { drinkName: 'Canadian standard drink', drink: '13.45 g of alcohol: a 341 ml bottle of 5% beer, a 142 ml glass of 12% wine, or a 43 ml (1.5 oz) shot of 40% spirits.',
    driving: 'In Canada, 0.08% is the criminal driving limit and most provinces issue roadside suspensions from 0.05%.',
    law: 'Criminal Code of Canada (0.08%) · provincial roadside limits (0.05%)' },
  us: { drinkName: 'US standard drink', drink: '14 g of alcohol: a 12 oz (355 ml) beer at 5%, a 5 oz (148 ml) glass of 12% wine, or a 1.5 oz (44 ml) shot of 40% spirits.',
    driving: 'The driving limit is 0.08% in every state except Utah (0.05%), and drivers under 21 face zero-tolerance limits.',
    law: 'State per se driving limits (0.08%; Utah 0.05%)' },
  uk: { drinkName: 'UK unit', drink: '8 g (10 ml) of pure alcohol. A pint of 4% beer is about 2.3 units and a 175 ml glass of 12% wine about 2.1.',
    driving: 'The driving limit is 0.08% in England, Wales and Northern Ireland, and 0.05% in Scotland.',
    law: 'Road Traffic Act 1988 (0.08%) · Scotland’s limit (0.05%) since 2014' },
  au: { drinkName: 'Australian standard drink', drink: '10 g of alcohol: about 285 ml of full-strength beer, 100 ml of wine, or a 30 ml shot of spirits.',
    driving: 'Australia’s driving limit is 0.05%, and learner and provisional drivers must be at zero.',
    law: 'State and territory road laws (0.05%; zero for learner and provisional drivers)' },
  nz: { drinkName: 'New Zealand standard drink', drink: '10 g of alcohol: roughly a 330 ml can of 4% beer, 100 ml of wine, or a 30 ml shot of spirits.',
    driving: 'New Zealand’s driving limit is 0.05% for drivers 20 and over, and zero for under-20s.',
    law: 'NZ Transport Agency limits (0.05% for drivers 20+, zero under 20)' },
  eu: { drinkName: 'Standard drink', drink: '10 g of alcohol here, the most common European size (countries range from about 8 to 14 g).',
    driving: 'Most of Europe sets the driving limit at 0.05%, with lower limits for new and professional drivers.',
    law: 'National drink-driving laws (mostly 0.05%)' },
};

/** Each region's drinking guidance, in a sentence or two, with its source. */
const GUIDANCE: Record<RegionCode, { title: string; text: string; source: string }> = {
  ca: { title: 'Canada’s guidance', source: 'Canada’s Guidance on Alcohol and Health, Canadian Centre on Substance Use and Addiction (CCSA), 2023',
    text: 'Risk rises with every drink. Per week, 2 or fewer standard drinks is low risk, 3 to 6 moderate, and 7 or more increasingly high. On any one occasion, no more than 2.' },
  us: { title: 'US guidance', source: 'Dietary Guidelines for Americans, 2025–2030 · NIAAA, Drinking Levels Defined',
    text: 'The 2025–2030 Dietary Guidelines dropped their old limits (1 drink a day for women, 2 for men) and now simply advise drinking less for better health. This app keeps those old limits as its weekly line: 7 standard drinks for women, 14 for men. The NIAAA counts 8 or more a week for women, or 15 or more for men, as heavy drinking.' },
  uk: { title: 'UK guidance', source: 'UK Chief Medical Officers’ Low Risk Drinking Guidelines, 2016',
    text: 'Men and women alike should stay within 14 units a week, spread over three or more days, with several drink-free days. One or two heavy sessions a week raise the risk of accidents, injuries and long-term illness.' },
  au: { title: 'Australia’s guidance', source: 'NHMRC Australian guidelines to reduce health risks from drinking alcohol, 2020',
    text: 'Healthy adults: no more than 10 standard drinks a week and no more than 4 on any one day. Under-18s, and anyone pregnant or breastfeeding, shouldn’t drink.' },
  nz: { title: 'New Zealand’s guidance', source: 'Health New Zealand Te Whatu Ora, low-risk alcohol drinking advice',
    text: 'Women: no more than 10 standard drinks a week and 2 a day. Men: no more than 15 a week and 3 a day. No more than 4 (women) or 5 (men) on any single occasion, and at least two alcohol-free days a week. The advice dates from 2011, and Health NZ has been reviewing it since 2024.' },
  eu: { title: 'Guidance in Europe', source: 'WHO Regional Office for Europe, statement in The Lancet Public Health, 2023',
    text: 'Advice varies by country. The WHO’s European office says no level of drinking is safe for health, because cancer risk starts with the first drink. This app uses 10 standard drinks a week as its line.' },
};

const methodFor = (region: RegionCode): [string, string][] => [
  ['Blood alcohol (BAC)', `Shown as a percentage: grams of alcohol per 100 ml of blood. ${LOCAL[region].driving}`],
  [LOCAL[region].drinkName, LOCAL[region].drink],
  ['Grams, not drinks', 'Each drink becomes grams of alcohol: ml × ABV × 0.789. Standard drinks are shown for your region.'],
  ['Absorption', 'On an empty stomach a drink peaks in about 30–45 minutes. Food in the last 3 hours slows that to 60–90 minutes and cuts how much reaches your blood by about 15%.'],
  ['Your body', 'Your weight, height, age and sex estimate your body water, which sets how far each drink is diluted.'],
  ['Fixed recovery', 'Blood alcohol falls about 0.015% an hour on average (most people between 0.010 and 0.025%). Water, coffee and sleep don’t speed that up; only time does. A meal may speed it slightly, but the app doesn’t count on that, so its estimates stay on the cautious side.'],
  ['The HP ring', 'Six equal segments between 0.02, 0.05, 0.08, 0.11, 0.15 and 0.25%, so early drinks are visible. 0 HP is 0.25%, where the risk of alcohol poisoning becomes serious. The drain rate is what you’ll lose over the next hour, heaviest while drinks absorb.'],
  ['Next-day debuffs', 'Worked out from your total grams per kg of body weight, your peak, and how much alcohol is still in your system at bedtime.'],
  ['Calories', '7 kcal per gram of alcohol plus 4 per gram of sugars and carbs. Your daily needs are estimated from your character sheet at a light activity level.'],
];

type Ref = { icon: keyof typeof ICONS; name: string; text: string; source: string };
const REFS: Ref[] = [
  // Its source is your region's driving law (LOCAL[region].law), filled in below.
  { icon: 'judgment', name: 'Impaired judgment', text: 'Reaction time, coordination and risk judgment worsen from low levels, well before the legal limits.', source: '' },
  { icon: 'sleep', name: 'Impaired sleep', text: 'Alcohol still in your system at bedtime suppresses REM sleep and breaks up the second half of the night, more so at higher doses.', source: 'Ebrahim et al., 2013, Alcoholism: Clinical and Experimental Research' },
  { icon: 'hrv', name: 'HRV drain', text: 'Heart-rate variability is the small variation between heartbeats; higher overnight means better recovery. In over 4,000 people, an HRV-based recovery score for the first hours of sleep fell by about 9, 24 and 39 percentage points after low, moderate and high intake.', source: 'Pietilä et al., 2018, JMIR Mental Health' },
  { icon: 'hangover', name: 'Hangover', text: 'Hangovers peak as blood alcohol returns to zero. Researchers once used a 0.11% peak as the line for a hangover, but about 1 in 5 students who reported one had stayed well below it, so there’s no safe threshold.', source: 'Verster et al., 2020, Journal of Clinical Medicine (reconsidering the 0.11% threshold)' },
  { icon: 'dehydration', name: 'Dehydration', text: 'Alcohol suppresses vasopressin, the hormone that helps your kidneys hold onto water, so you pass more urine. In one study the effect was smaller when people were already short of fluid.', source: 'Hobson and Maughan, 2010, Alcohol and Alcoholism' },
  { icon: 'hangxiety', name: 'Hangxiety', text: 'Next-day anxiety as the brain rebounds from alcohol’s calming effect. In one study of social drinkers it showed up most strongly in shy people.', source: 'Marsh et al., 2019, Personality and Individual Differences' },
  { icon: 'recovery', name: 'Slow recovery', text: 'Heavy drinking after exercise cut muscle protein synthesis by 24 to 37% compared with protein alone, in a small study of 8 active men.', source: 'Parr et al., 2014, PLoS One' },
  { icon: 'fatpause', name: 'Fat burning paused', text: 'The body clears alcohol first; whole-body fat burning fell by about 73% after 24 g of alcohol, roughly two drinks.', source: 'Siler et al., 1999, American Journal of Clinical Nutrition' },
  { icon: 'munchies', name: 'Munchies', text: 'Alcohol increases appetite and how much you eat at the next meal, often called the apéritif effect.', source: 'Yeomans, 2010, Physiology and Behavior' },
  { icon: 'strain', name: 'Body under strain', text: 'The NIAAA rates impairment as severe from about 0.16% and life-threatening from about 0.31%, with vomiting while drowsy, choking and slowed breathing among the dangers. This app treats 0.25% as critical to leave a margin, and the two-day recovery is a cautious estimate.', source: 'US National Institute on Alcohol Abuse and Alcoholism, alcohol overdose and blood alcohol level fact sheets' },
  { icon: 'lined', name: 'Well fed', text: 'Food in your stomach slows absorption, giving a lower, later peak. The same study found alcohol also cleared a little faster right after a meal; the app only counts the lower peak.', source: 'Jones and Jönsson, 1994, Journal of Forensic Sciences' },
  { icon: 'hydrated', name: 'Hydrated', text: 'Water offsets the fluid alcohol makes you lose and spaces out your drinks. It doesn’t lower blood alcohol.', source: 'Hobson and Maughan, 2010, Alcohol and Alcoholism' },
];

// Each checked against the paper in November 2026.
const MODEL_SOURCES = 'Watson, Watson and Batt, 1980, American Journal of Clinical Nutrition (body water) · Jones, 2010, Forensic Science International (elimination) · Jones and Jönsson, 1994, Journal of Forensic Sciences (food) · Mifflin et al., 1990, American Journal of Clinical Nutrition (daily calories)';

export function ScienceScreen() {
  const colors = useColors();
  const styles = useStyles(colors);
  const { panel } = panelStyles(colors);
  const { data } = useApp();
  const region = data.profile.region;
  const guide = GUIDANCE[region];
  return (
    <Screen>
      <Text style={styles.h1}>The science</Text>
      <Text style={styles.lead}>Status Effects turns what you log into estimates. Here’s how, and where each effect comes from.</Text>

      <View style={[panel, styles.card]}>
        <Text style={styles.h2}>How the numbers work</Text>
        {methodFor(region).map(([title, body]) => (
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
              <Text style={styles.source}>{r.icon === 'judgment' ? LOCAL[region].law : r.source}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[panel, styles.card]}>
        <Text style={styles.h2}>{guide.title}</Text>
        <Text style={styles.body}>{guide.text}</Text>
        <Text style={styles.source}>{guide.source}</Text>
        <Text style={styles.source}>Showing the guidance for the region picked in Options.</Text>
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
