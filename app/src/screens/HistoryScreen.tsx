import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import {
  REGIONS, achievements, addDays, byNight, canadaRisk, daysInclusive, dayKey, dryStreaks, keyToTime, periodRange, periodStats,
  feelVsDrinks, startOfDay, startOfWeek, stepPeriod, summarizeNight, weeklyGuidance, type NightSummary, type Period,
} from '../../../engine/src/index.ts';
import { AchievementsCard, CaloriesCard, CheckInCard, MorningsCard, PatternsCard, SleepCard } from '../components/history/Sections';
import { useApp } from '../AppDataProvider';
import { sampleHistory } from '../sampleHistory';
import { Calendar, MONTHS_LONG } from '../components/history/Calendar';
import { BarChart, type Bar, type GuideLine } from '../components/history/BarChart';
import { Segmented } from '../components/Form';
import { useColors, makeStyles, type Palette, fonts, panelStyles } from '../theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "Nov 9–15, 2026", "Oct 27 – Nov 2, 2026", or across years. */
function fmtRange(a: number, b: number): string {
  const x = new Date(a), y = new Date(b);
  if (x.getFullYear() !== y.getFullYear()) return `${MONTHS[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()} – ${MONTHS[y.getMonth()]} ${y.getDate()}, ${y.getFullYear()}`;
  if (x.getMonth() !== y.getMonth()) return `${MONTHS[x.getMonth()]} ${x.getDate()} – ${MONTHS[y.getMonth()]} ${y.getDate()}, ${y.getFullYear()}`;
  return `${MONTHS[x.getMonth()]} ${x.getDate()}–${y.getDate()}, ${x.getFullYear()}`;
}

export function HistoryScreen() {
  const colors = useColors();
  const styles = useStyles(colors);
  const { panel } = panelStyles(colors);
  const { data, now, update } = useApp();
  const [period, setPeriod] = useState<Period>('week');
  const [cursor, setCursor] = useState(now);
  const [selected, setSelected] = useState<string | null>(null);
  const [sample, setSample] = useState(false);
  const today = startOfDay(now);
  const region = data.profile.region;
  const g = REGIONS[region].gramsPerStandardDrink;
  const std = (grams: number) => (grams / g).toFixed(1);

  // Real nights: everything filed away, plus tonight.
  const real = useMemo(() => [...data.past, data.tonight]
    .map(n => summarizeNight(data.profile, n.events)).filter((s): s is NightSummary => s !== null), [data.past, data.tonight, data.profile]);
  // Morning check-ins against how much was drunk the night before (all time, real data only).
  const feelEntries = useMemo(() => [...data.past, data.tonight].filter(n => n.feel != null)
    .map(n => ({ std: n.events.reduce((t, e) => t + (e.type === 'drink' ? e.grams : 0), 0) / g, feel: n.feel! })), [data.past, data.tonight, g]);
  const feelBuckets = useMemo(() => feelVsDrinks(feelEntries), [feelEntries]);
  const demo = useMemo(() => (sample ? sampleHistory(data.profile, today) : null), [sample, data.profile, today]);
  const nights = useMemo(() => byNight(demo ? demo.summaries : real), [demo, real]);
  const trackingStart = startOfDay(demo ? demo.trackingStart : Math.min(data.trackingSince, ...real.map(r => r.start)));

  // Keep the selection inside the tracked range.
  let c = Math.min(cursor, today);
  if (periodRange(period, c).end < trackingStart) c = trackingStart;
  const R = periodRange(period, c);
  const live = R.end >= today;
  const elapsedEnd = Math.min(R.end, today);
  const st = periodStats(nights, R.start, R.end, trackingStart, today);

  // Compare with the same stretch of the previous period ("same point last week" while this one is in progress).
  const P = periodRange(period, stepPeriod(period, R.start, -1));
  const elapsed = daysInclusive(R.start, elapsedEnd);
  const prev = P.start >= trackingStart ? periodStats(nights, P.start, Math.min(P.end, addDays(P.start, elapsed - 1)), trackingStart, today) : null;
  const delta = prev && prev.grams > 0 ? (st.grams - prev.grams) / prev.grams * 100 : null;

  const word = period;
  const isLast = periodRange(period, stepPeriod(period, today, -1)).start === R.start;
  const kicker = live ? `This ${word} so far` : isLast ? `Last ${word}` : word[0].toUpperCase() + word.slice(1);
  const title = period === 'week' ? fmtRange(R.start, R.end) : period === 'month' ? `${MONTHS_LONG[new Date(R.start).getMonth()]} ${new Date(R.start).getFullYear()}` : String(new Date(R.start).getFullYear());
  const short = period === 'week' ? fmtRange(R.start, R.end).replace(/, \d{4}$/, '') : title;
  let note = !live ? '' : period === 'week' ? `${st.days} of 7 days so far` : `${fmtRange(Math.max(R.start, trackingStart), elapsedEnd)} · ${st.days} days`;
  if (R.start < trackingStart) note = `Tracking starts ${MONTHS[new Date(trackingStart).getMonth()]} ${new Date(trackingStart).getDate()} · ${st.days} days`;
  const canPrev = periodRange(period, stepPeriod(period, R.start, -1)).end >= trackingStart;

  // Guidance: a week is judged on its total; months and years on their weekly average.
  const guide = weeklyGuidance(region, data.profile.sex);
  const weeks = period === 'week' ? 1 : Math.max(1, st.days) / 7;
  const perWeek = st.grams / g / weeks;
  const isCanada = region === 'ca';
  const risk = isCanada ? canadaRisk(perWeek) : null;
  const overGuide = st.grams > guide.weeklyGrams * weeks;

  // Chart: days of the week, weeks of the month, or months of the year.
  const gramsIn = (a: number, b: number) => { let s = 0; for (let t = Math.max(a, trackingStart); t <= Math.min(b, today); t = addDays(t, 1)) s += nights.get(dayKey(t))?.grams ?? 0; return s; };
  const wk = guide.weeklyGrams / g, wkUp = guide.upperWeeklyGrams ? guide.upperWeeklyGrams / g : null;
  let bars: Bar[] = [], lines: GuideLine[] = [], chartTitle = '', minMax = 0, chartNote = '';
  if (period === 'week') {
    chartTitle = 'Drinks each day';
    bars = DOW.map((d, i) => { const t = addDays(R.start, i), v = gramsIn(t, t) / g;
      return { value: v, label: d, valueLabel: v ? v.toFixed(1) : '', faint: t > today, detail: `${d} ${MONTHS[new Date(t).getMonth()]} ${new Date(t).getDate()}: ${t > today ? 'still to come' : v.toFixed(1) + ' standard drinks'}` }; });
    if (guide.perOccasionDrinks) { lines = [{ value: guide.perOccasionDrinks, label: `${guide.perOccasionDrinks} on any one occasion` }]; minMax = guide.perOccasionDrinks; }
  } else if (period === 'month') {
    chartTitle = 'Drinks each week';
    for (let w = startOfWeek(R.start); w <= R.end; w = addDays(w, 7)) {
      const v = gramsIn(w, addDays(w, 6)) / g, partial = addDays(w, 6) > today || w < trackingStart;
      bars.push({ value: v, label: `${MONTHS[new Date(w).getMonth()]} ${new Date(w).getDate()}`, faint: partial, detail: `Week of ${fmtRange(w, addDays(w, 6))}: ${v.toFixed(1)} standard drinks${partial ? ' (partial week)' : ''}` });
    }
    lines = wkUp ? [{ value: wk, label: `Low risk: ${Math.round(wk)}` }, { value: wkUp, label: `Moderate: ${Math.round(wkUp)}` }] : [{ value: wk, label: `Guideline ${Math.round(wk)}` }];
    minMax = wkUp ?? wk; chartNote = 'Weeks run Monday to Sunday. Faded bars are partial weeks.';
  } else {
    chartTitle = 'Drinks each month';
    const y = new Date(R.start).getFullYear(), f = 365 / 12 / 7;
    bars = MONTHS.map((mn, m) => { const a = new Date(y, m, 1).getTime(), b = new Date(y, m + 1, 0).getTime(), v = gramsIn(a, b) / g, partial = b > today || a < trackingStart;
      return { value: v, label: mn[0], faint: partial, detail: `${MONTHS_LONG[m]} ${y}: ${v.toFixed(1)} standard drinks${partial ? ' (partial month)' : ''}` }; });
    lines = wkUp ? [{ value: wk * f, label: `Low risk ≈ ${Math.round(wk * f)}/mo` }, { value: wkUp * f, label: `Moderate ≈ ${Math.round(wkUp * f)}/mo` }] : [{ value: wk * f, label: `Guideline ≈ ${Math.round(wk * f)}/mo` }];
    minMax = (wkUp ?? wk) * f; chartNote = 'Monthly lines are the weekly guidance scaled up. Faded bars are partial months.';
  }

  const streaks = dryStreaks(nights, trackingStart, today);
  const badges = useMemo(() => achievements(nights, trackingStart, today, guide.weeklyGrams), [nights, trackingStart, today, guide.weeklyGrams]);
  const sel = selected ? nights.get(selected) : undefined;
  const hasAny = nights.size > 0;

  const step = (dir: -1 | 1) => { setCursor(stepPeriod(period, R.start, dir)); setSelected(null); };

  return (
    <Screen stickyHeaderIndices={[2]}>
      <View style={styles.titleRow}>
        <Text style={styles.h1}>History</Text>
        {sample ? (
          <Pressable onPress={() => setSample(false)} accessibilityRole="button" style={styles.sampleChip}>
            <Text style={styles.sampleTxt}>SAMPLE DATA · EXIT</Text>
          </Pressable>
        ) : null}
      </View>

      <Segmented<Period> label="Period" value={period} onChange={p => { setPeriod(p); if (selected) setCursor(keyToTime(selected)); }}
        options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} />

      {/* Sticky: always shows exactly which dates the numbers below are for.
          The plain outer View matters: on iPhone, React Native moves a sticky header's own style onto a
          wrapper, which would drop the row layout. Styling the inner View keeps arrows either side of the dates. */}
      <View>
      <View style={styles.rangeBar}>
        <Pressable onPress={() => step(-1)} disabled={!canPrev} style={[styles.arrow, !canPrev && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={`Previous ${word}`}>
          <Text style={styles.arrowTxt}>‹</Text>
        </Pressable>
        <View style={styles.rangeMid} accessibilityLiveRegion="polite">
          <Text style={styles.kicker}>{kicker.toUpperCase()}</Text>
          <Text style={styles.rangeTitle}>{title}</Text>
          {note ? <Text style={styles.rangeNote}>{note}</Text> : null}
        </View>
        <Pressable onPress={() => step(1)} disabled={live} style={[styles.arrow, live && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={`Next ${word}`}>
          <Text style={styles.arrowTxt}>›</Text>
        </Pressable>
      </View>
      </View>

      {!hasAny ? (
        <View style={[panel, styles.card]}>
          <Text style={styles.h2}>No nights yet</Text>
          <Text style={styles.lead}>Each night you log is filed here the morning after. Your calendar, streaks and weekly totals build up from there.</Text>
          <Pressable onPress={() => setSample(true)} accessibilityRole="button"><Text style={styles.link}>Preview History with sample data</Text></Pressable>
        </View>
      ) : null}

      <View style={styles.tiles}>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>STANDARD DRINKS</Text>
          <Text style={styles.tileValue}>{std(st.grams)}</Text>
          {risk ? (
            <Text style={styles.tileSub}>
              <Text style={{ color: risk === 'low' ? colors.good : risk === 'moderate' ? colors.warn : colors.bad, fontFamily: fonts.bodyBold }}>
                {risk === 'low' ? '✓ Low risk' : risk === 'moderate' ? '▲ Moderate risk' : '▲ Increasingly high risk'}
              </Text>
              {period === 'week' ? (live ? ' so far this week' : ' for this week') : ` · ${perWeek.toFixed(1)} a week on average`}
            </Text>
          ) : (
            <Text style={styles.tileSub}>
              <Text style={{ color: overGuide ? colors.warn : colors.good, fontFamily: fonts.bodyBold }}>{overGuide ? '▲ Over' : '✓ Under'} guideline</Text>
            </Text>
          )}
          {delta != null ? <Text style={styles.tileSub}>{delta <= 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(0)}% vs {live ? `same point last ${word}` : `previous ${word}`}</Text> : null}
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>ALCOHOL-FREE DAYS</Text>
          <Text style={styles.tileValue}>{st.dryDays}<Text style={styles.tileSmall}> of {st.days}</Text></Text>
          <Text style={styles.tileSub}>{period === 'week' ? (live && st.days < 7 ? `${7 - st.days} days still to come` : 'this week') : `${(st.dryDays / Math.max(1, st.days) * 7).toFixed(1)} a week on average`}</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>HEAVY NIGHTS</Text>
          <Text style={styles.tileValue}>{st.heavyNights}</Text>
          <Text style={styles.tileSub}>Reached the Drunk zone (0.08% or more)</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>HOURS DEBUFFED</Text>
          <Text style={styles.tileValue}>{Math.round(st.debuffHours)}<Text style={styles.tileSmall}> h</Text></Text>
          <Text style={styles.tileSub}>{Math.round(st.sleepHoursAffected)} h of sleep with alcohol in your system</Text>
        </View>
      </View>

      <View style={[panel, styles.card]}>
        <View style={styles.tiles}>
          <View style={styles.tile}><Text style={styles.tileLabel}>ALCOHOL-FREE STREAK</Text><Text style={styles.tileValue}>{streaks.current}<Text style={styles.tileSmall}> days</Text></Text><Text style={styles.tileSub}>Current</Text></View>
          <View style={styles.tile}><Text style={styles.tileLabel}>LONGEST STREAK</Text><Text style={styles.tileValue}>{streaks.longest}<Text style={styles.tileSmall}> days</Text></Text><Text style={styles.tileSub}>Since tracking began</Text></View>
        </View>
        <Calendar period={period} range={R} nights={nights} today={today} trackingStart={trackingStart} selected={selected} gramsPerDrink={g}
          onSelectDay={k => { setSelected(selected === k ? null : k); if (selected !== k) setCursor(keyToTime(k)); }}
          onOpenMonth={t => { setPeriod('month'); setCursor(t); setSelected(null); }} />
        {selected ? (
          <View style={styles.dayDetail}>
            <Text style={styles.dayTitle}>{new Date(keyToTime(selected)).toDateString()}</Text>
            <Text style={styles.lead}>{sel ? `${sel.drinks} drinks · ${std(sel.grams)} standard drinks · peak ${sel.peak.toFixed(2)}%` : 'Alcohol-free day.'}</Text>
            {sel?.critical ? <Text style={[styles.lead, { color: colors.bad }]}>Blood alcohol reached the critical range this night.</Text> : null}
          </View>
        ) : null}
      </View>

      <View style={[panel, styles.card]}>
        <View style={styles.secHead}><Text style={styles.h2}>{chartTitle}</Text><Text style={styles.secLabel}>{short}</Text></View>
        <BarChart bars={bars} lines={lines} minMax={minMax} accessibilityLabel={`${chartTitle}, ${title}`} />
        <Text style={styles.fine}>{guide.source}{chartNote ? '. ' + chartNote : ''}</Text>
      </View>

      {data.settings.calories ? <CaloriesCard st={st} label={short} units={data.settings.units} compareWith={data.settings.compareWith ?? 'pizza'} /> : null}
      <SleepCard st={st} label={short} />
      <PatternsCard st={st} label={short} gramsPerDrink={g} />
      <MorningsCard buckets={feelBuckets} checkIns={feelEntries.length} />
      <AchievementsCard list={badges} />
      <CheckInCard region={region} sex={data.profile.sex} last={data.audit}
        onSave={score => update(d => ({ ...d, audit: { score, at: Date.now() } }))} />

      {hasAny && !sample ? (
        <Pressable onPress={() => setSample(true)} accessibilityRole="button"><Text style={styles.link}>Preview with sample data</Text></Pressable>
      ) : null}
      <Text style={styles.fine}>Coming with the morning-after report: how you feel compared with how much you drank.</Text>
    </Screen>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  page: { paddingHorizontal: 16, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontFamily: fonts.displayBold, fontSize: 44, letterSpacing: 0.4, color: colors.ink },
  h2: { fontFamily: fonts.display, fontSize: 29, letterSpacing: 0.4, color: colors.ink },
  sampleChip: { borderWidth: 2, borderColor: colors.nudgeEdge, paddingHorizontal: 8, paddingVertical: 5 },
  sampleTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.gold, letterSpacing: 0.5 },
  rangeBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.edgeHi, padding: 8 },
  arrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi },
  arrowTxt: { color: colors.ink, fontSize: 22, fontFamily: fonts.bodyBold },
  rangeMid: { flex: 1, alignItems: 'center' },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, color: colors.inkDim },
  rangeTitle: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 0.4, color: colors.ink, textAlign: 'center' },
  rangeNote: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
  card: { padding: 14, gap: 14 },
  lead: { fontFamily: fonts.body, fontSize: 14, color: colors.inkDim, lineHeight: 20 },
  link: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mana, textAlign: 'center', textDecorationLine: 'underline' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.sunk, padding: 12, gap: 3 },
  tileLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, color: colors.inkDim },
  tileValue: { fontFamily: fonts.num, fontSize: 36, color: colors.ink, lineHeight: 38 },
  tileSmall: { fontFamily: fonts.num, fontSize: 20, color: colors.inkDim },
  tileSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkDim, lineHeight: 17 },
  dayDetail: { backgroundColor: colors.sunk, padding: 10, gap: 2 },
  dayTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  secLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, color: colors.inkDim },
  fine: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint, lineHeight: 18 },
}));
