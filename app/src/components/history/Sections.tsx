// History part 2: calories, sleep & recovery, patterns, achievements and the AUDIT-C check-in.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  auditCCutoff, auditCScore, feelWord, type FeelBucket, type Achievement, type AchievementId, type DrinkCategory, type PeriodStats, type RegionCode, type Sex,
} from '../../../../engine/src/index.ts';
import type { FoodCompare, Units } from '../../storage';
import { FOOD } from '../../food';
import { ICONS } from '../../sprites';
import { PixelSprite } from '../PixelSprite';
import { BarChart } from './BarChart';
import { PixelButton } from '../Form';
import { colors, fonts, panel } from '../../theme';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Card({ title, label, children }: { title: string; label?: string; children: React.ReactNode }) {
  return (
    <View style={[panel, s.card]}>
      <View style={s.head}><Text style={s.h2}>{title}</Text>{label ? <Text style={s.label}>{label}</Text> : null}</View>
      {children}
    </View>
  );
}

function Tile({ label, value, small, sub, children }: { label: string; value: string; small?: string; sub?: string; children?: React.ReactNode }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={s.tileValue}>{value}{small ? <Text style={s.tileSmall}> {small}</Text> : null}</Text>
      {sub ? <Text style={s.tileSub}>{sub}</Text> : null}
      {children}
    </View>
  );
}

function Expand({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen(o => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={s.expandTitle}>{open ? '▾' : '▸'} {title}</Text>
      </Pressable>
      {open ? <Text style={s.body}>{children}</Text> : null}
    </View>
  );
}

// ---------- Mornings (feel vs drinks) ----------

const FEEL_COLORS = [colors.good, '#a6d86a', colors.gold, colors.warn, colors.bad];

export function MorningsCard({ buckets, checkIns }: { buckets: FeelBucket[]; checkIns: number }) {
  return (
    <Card title="Mornings" label="All time">
      {checkIns === 0 ? (
        <Text style={s.body}>After a night out, the morning report asks how you feel. Your answers build up here, showing how your mornings go after 1–2 drinks compared with 5 or more.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {buckets.map(b => (
            <View key={b.label} style={m.row} accessibilityLabel={`${b.label}: ${b.avg == null ? 'no check-ins' : `usually ${feelWord(b.avg)}, ${b.nights} nights`}`}>
              <Text style={m.label}>{b.label}</Text>
              <View style={m.track}>
                {b.avg != null ? <View style={[m.fill, { width: `${((b.avg + 0.6) / 4.6) * 100}%`, backgroundColor: FEEL_COLORS[Math.round(b.avg)] }]} /> : null}
              </View>
              <Text style={[m.word, b.avg != null && { color: FEEL_COLORS[Math.round(b.avg)] }]}>{b.avg == null ? '—' : feelWord(b.avg)}</Text>
              <Text style={m.n}>{b.nights ? `${b.nights}×` : ''}</Text>
            </View>
          ))}
          <Text style={s.tileSub}>The bar gets longer the worse you felt. Based on {checkIns} morning check-in{checkIns === 1 ? '' : 's'}.</Text>
        </View>
      )}
    </Card>
  );
}

const m = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 82, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkDim },
  track: { flex: 1, height: 12, backgroundColor: colors.sunk },
  fill: { height: '100%' },
  word: { width: 64, fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.inkFaint },
  n: { width: 28, textAlign: 'right', fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint },
});

// ---------- Calories ----------

export function CaloriesCard({ st, label, units, compareWith }: { st: PeriodStats; label: string; units: Units; compareWith: FoodCompare }) {
  const f = FOOD[compareWith], n = st.kcal / f.kcal;
  const energy = units === 'imperial' ? `${(st.kcal / 3500).toFixed(1)} lb` : `${(st.kcal / 7700).toFixed(1)} kg`;
  return (
    <Card title="Calories from drinks" label={label}>
      <View style={s.tiles}>
        <Tile label="TOTAL" value={Math.round(st.kcal).toLocaleString()} small="kcal" sub={`≈ ${n.toFixed(n < 10 ? 1 : 0)} ${Math.abs(n - 1) < 0.05 ? f.one : f.many}`} />
        <Tile label="ENERGY EQUIVALENT" value={energy} sub="The same energy as this much body fat" />
      </View>
      <Expand title="Why energy, not weight gained?">
        This doesn't mean you gained it. Your body burns alcohol first and puts other fuel on hold, so food eaten around drinking is
        more likely to be stored. Whether your weight changes depends on everything else you eat and do.
      </Expand>
    </Card>
  );
}

// ---------- Sleep & recovery ----------

export function SleepCard({ st, label }: { st: PeriodStats; label: string }) {
  const withHrv = st.nights.filter(n => n.hrvDropPct != null);
  const avg = withHrv.length ? withHrv.reduce((a, n) => a + (n.hrvDropPct ?? 0), 0) / withHrv.length : 0;
  return (
    <Card title="Sleep and recovery" label={label}>
      <View style={s.tiles}>
        <Tile label="BED WITH ALCOHOL IN YOU" value={String(st.sleepAffectedNights)} small={`of ${st.nights.length}`} sub="drinking nights" />
        <Tile label="AVERAGE HRV HIT" value={withHrv.length ? avg.toFixed(0) : '–'} small={withHrv.length ? '%' : undefined}
          sub={withHrv.length ? `Estimated drop in overnight recovery, on the ${withHrv.length} night${withHrv.length === 1 ? '' : 's'} drinking reached bedtime` : 'No nights where drinking reached bedtime'} />
      </View>
      <Expand title="What is HRV?">
        Heart rate variability is the small, changing gap between heartbeats. When you're relaxed and recovering it's higher; when your
        body is under strain, from illness, stress, poor sleep or alcohol, it drops. Overnight HRV is one of the best signs of how well
        you actually recovered. Compare against your own normal, not other people's.
      </Expand>
      <View style={s.soon}>
        <Text style={s.soonTxt}>Coming later: connect Apple Health to see your own sleep and HRV, not just estimates.</Text>
      </View>
    </Card>
  );
}

// ---------- Patterns ----------

const MIX: { key: DrinkCategory; label: string; color: string }[] = [
  { key: 'beer', label: 'Beer & cider', color: '#e8a73a' },
  { key: 'wine', label: 'Wine', color: '#b5405e' },
  { key: 'spirits', label: 'Spirits', color: '#6f93ff' },
  { key: 'mixed', label: 'Mixed', color: '#3fbf95' },
];

export function PatternsCard({ st, label, gramsPerDrink }: { st: PeriodStats; label: string; gramsPerDrink: number }) {
  const total = st.gramsByWeekday.reduce((a, b) => a + b, 0);
  const share = st.gramsByWeekday.map(g => (total ? (g / total) * 100 : 0));
  const top = [...share.keys()].sort((a, b) => share[b] - share[a]).slice(0, 2);
  const mixTotal = MIX.reduce((a, m) => a + st.mix[m.key], 0);
  const pace = st.spanHours ? st.drinks / st.spanHours : 0;
  const perWater = st.waters ? st.drinks / st.waters : null;
  return (
    <Card title="Patterns" label={label}>
      {total ? (
        <>
          <Text style={s.subhead}>SHARE OF DRINKS BY DAY</Text>
          <BarChart height={140} accessibilityLabel="Share of drinks by day of the week"
            bars={share.map((v, i) => ({ value: v, label: DOW[i], valueLabel: top.includes(i) && v ? `${Math.round(v)}%` : '', detail: `${DOW[i]}: ${Math.round(v)}% of your drinks` }))} />
          <Text style={s.body}>{DOW[top[0]]}s and {DOW[top[1]]}s account for {Math.round(share[top[0]] + share[top[1]])}% of your drinks.</Text>

          <Text style={[s.subhead, { marginTop: 6 }]}>DRINK MIX</Text>
          <View style={s.stack}>
            {MIX.filter(m => st.mix[m.key] > 0).map(m => <View key={m.key} style={{ flex: st.mix[m.key], backgroundColor: m.color }} />)}
          </View>
          <View style={s.legend}>
            {MIX.map(m => (
              <View key={m.key} style={s.legendItem}>
                <View style={[s.swatch, { backgroundColor: m.color }]} />
                <Text style={s.legendTxt}>{m.label} {mixTotal ? Math.round((st.mix[m.key] / mixTotal) * 100) : 0}%</Text>
              </View>
            ))}
          </View>
        </>
      ) : <Text style={s.body}>No drinks in this period.</Text>}
      <View style={s.tiles}>
        <Tile label="AVERAGE PACE" value={pace.toFixed(1)} sub="drinks an hour" />
        <Tile label="WATER" value={perWater ? `1:${Math.round(perWater)}` : '0'} sub={perWater ? `1 water for every ${Math.round(perWater)} drinks` : 'No water logged'} />
        <Tile label="PER DRINKING NIGHT" value={st.nights.length ? (st.grams / gramsPerDrink / st.nights.length).toFixed(1) : '0'} sub="standard drinks on average" />
      </View>
    </Card>
  );
}

// ---------- Achievements ----------

const ACH: Record<AchievementId, { name: string; icon: keyof typeof ICONS; done: string; todo: (a: Achievement) => string }> = {
  dryWeek: { name: 'Dry week', icon: 'called', done: '7 alcohol-free days in a row', todo: a => `Best so far: ${a.current} of 7 days` },
  weekendOff: { name: 'Weekend off', icon: 'lined', done: 'A whole Friday to Sunday alcohol-free', todo: () => 'Go alcohol-free Friday to Sunday' },
  underTheLine: { name: 'Under the line', icon: 'pace', done: '4 weeks in a row within the weekly guideline', todo: a => `Best run: ${a.current} of 4 weeks` },
  hydrated: { name: 'Hydrated', icon: 'hydrated', done: 'At least 1 water per 2 drinks this month', todo: a => (Number.isFinite(a.current) ? `This month: 1 water per ${Math.round(a.current)} drinks. Aim for 1 per 2.` : 'Log water alongside drinks. Aim for 1 per 2.') },
  clearByBedtime: { name: 'Clear by bedtime', icon: 'sleep', done: '5 drinking nights in a row cleared before bed', todo: a => `Best run: ${a.current} of 5 nights` },
  steadyHand: { name: 'Steady hand', icon: 'judgment', done: 'Averaged 1 drink an hour or slower this month', todo: a => (a.current ? `This month: ${a.current.toFixed(1)} drinks an hour. Aim for 1.` : 'Pace yourself at 1 drink an hour or slower') },
};

export function AchievementsCard({ list }: { list: Achievement[] }) {
  return (
    <Card title="Achievements" label={`${list.filter(a => a.earned).length} of ${list.length}`}>
      <View style={s.badges}>
        {list.map(a => {
          const d = ACH[a.id];
          return (
            <View key={a.id} style={s.badge} accessible accessibilityLabel={`${d.name}: ${a.earned ? 'earned. ' + d.done : 'not yet. ' + d.todo(a)}`}>
              <PixelSprite sprite={ICONS[d.icon]} scale={2} fill={a.earned ? 1 : 0} />
              <View style={{ flex: 1 }}>
                <Text style={[s.badgeName, !a.earned && { color: colors.inkDim }]}>{d.name}</Text>
                <Text style={s.badgeSub}>{a.earned ? d.done : d.todo(a)}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={s.fine}>Achievements only reward good choices, never how much you drank.</Text>
    </Card>
  );
}

// ---------- AUDIT-C check-in ----------

const QUESTIONS = (uk: boolean) => [
  { q: 'How often do you have a drink containing alcohol?', a: ['Never', 'Monthly or less', '2–4 times a month', '2–3 times a week', '4 or more times a week'] },
  { q: `How many ${uk ? 'units' : 'standard drinks'} do you have on a typical day when you're drinking?`, a: uk ? ['0–2', '3–4', '5–6', '7–9', '10 or more'] : ['1–2', '3–4', '5–6', '7–9', '10 or more'] },
  { q: uk ? 'How often do you have 6 or more units (women) or 8 or more (men) on one occasion?' : 'How often do you have 6 or more drinks on one occasion?', a: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
];

const HELP: Record<RegionCode, string> = {
  ca: 'Your family doctor or nurse practitioner can help, and Health Canada lists free substance-use support for every province and territory.',
  uk: 'Drinkline is free and confidential: 0300 123 1110.',
  us: 'The SAMHSA National Helpline is free, confidential and open 24/7: 1-800-662-4357.',
  au: 'The National Alcohol and Other Drug Hotline is free and confidential: 1800 250 015.',
  eu: 'Your GP or local health service can point you to support near you.',
};

export function CheckInCard({ region, sex, last, onSave }: { region: RegionCode; sex: Sex; last?: { score: number; at: number }; onSave: (score: number) => void }) {
  const [answers, setAnswers] = useState<(number | null)[] | null>(null);
  const qs = QUESTIONS(region === 'uk');
  if (answers) {
    const ready = answers.every(a => a != null);
    return (
      <Card title="Check-in" label="3 questions">
        {qs.map((q, i) => (
          <View key={i} style={{ gap: 6 }}>
            <Text style={s.q}>{q.q}</Text>
            <View style={s.opts}>
              {q.a.map((opt, v) => {
                const on = answers[i] === v;
                return (
                  <Pressable key={v} onPress={() => setAnswers(a => a!.map((x, j) => (j === i ? v : x)))} accessibilityRole="radio" accessibilityState={{ selected: on }}
                    style={[s.opt, on && s.optOn]}>
                    <Text style={[s.optTxt, on && { color: colors.edge }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <View style={s.row}>
          <PixelButton label="See result" primary flex={1} disabled={!ready} onPress={() => { onSave(auditCScore(answers as [number, number, number])); setAnswers(null); }} />
          <PixelButton label="Cancel" flex={1} onPress={() => setAnswers(null)} />
        </View>
      </Card>
    );
  }
  const flag = last ? last.score >= auditCCutoff(region, sex) : false;
  return (
    <Card title="Check-in" label="Every few months">
      {last ? (
        <View style={{ gap: 8 }}>
          <Text style={s.label}>LAST CHECK-IN · {new Date(last.at).toDateString().toUpperCase()}</Text>
          <Text style={s.resultTitle}>{flag ? 'Your answers suggest your drinking may be raising your health risks.' : 'Your answers suggest lower-risk drinking.'}</Text>
          <Text style={s.body}>{flag ? `That's common, and it's worth acting on. ${HELP[region]}` : "Keep an eye on the patterns above. We'll offer this again in a few months."} Score {last.score} of 12.</Text>
          <Text style={s.fine}>AUDIT-C is a short screening questionnaire, not a diagnosis.</Text>
          <PixelButton label="Retake check-in" onPress={() => setAnswers([null, null, null])} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={s.body}>Three quick questions every few months help spot whether your drinking is drifting into higher risk. Your answers stay on this device.</Text>
          <PixelButton label="Take the 1-minute check-in" onPress={() => setAnswers([null, null, null])} />
        </View>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  card: { padding: 14, gap: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  h2: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 0.4, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, color: colors.inkDim },
  subhead: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, color: colors.inkDim },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.inkDim, lineHeight: 20 },
  fine: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint, lineHeight: 18 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.sunk, padding: 12, gap: 3 },
  tileLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, color: colors.inkDim },
  tileValue: { fontFamily: fonts.num, fontSize: 34, color: colors.ink, lineHeight: 36 },
  tileSmall: { fontFamily: fonts.num, fontSize: 20, color: colors.inkDim },
  tileSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkDim, lineHeight: 17 },
  expandTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, marginBottom: 6 },
  soon: { backgroundColor: colors.sunk, padding: 10 },
  soonTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint },
  stack: { flexDirection: 'row', height: 18, gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 12, height: 12 },
  legendTxt: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkDim },
  badges: { gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.sunk, padding: 10 },
  badgeName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  badgeSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkDim, lineHeight: 17 },
  q: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink, lineHeight: 20 },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  opt: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.sunk, borderWidth: 2, borderColor: colors.edgeHi },
  optOn: { backgroundColor: colors.gold, borderColor: '#ffe39a' },
  optTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkDim },
  row: { flexDirection: 'row', gap: 8 },
  resultTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, lineHeight: 21 },
});
