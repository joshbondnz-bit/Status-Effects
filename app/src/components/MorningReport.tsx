// The morning-after report: how last night went, what's still running, and "how do you feel?".
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  FEELS, HOUR, effects, hpFromBac, simulateNight, standardDrinks, summarizeNight, type Feel, type Profile,
} from '../../../engine/src/index.ts';
import type { AppData, SavedNight } from '../storage';
import { EFFECT_NAMES } from '../copy';
import { colors, fonts, panel } from '../theme';
import { duration, money } from '../format';

/** How long after wake-up the report stays up. */
const REPORT_HOURS = 18;

/**
 * The night to report on, if it's morning-after time: tonight's log once wake-up has passed,
 * or the most recently filed night. Only nights with drinks, and only until REPORT_HOURS after wake-up.
 */
export function findMorningNight(data: AppData, now: number): { night: SavedNight; where: 'tonight' | 'past' } | null {
  const candidates: { night: SavedNight; where: 'tonight' | 'past' }[] = [{ night: data.tonight, where: 'tonight' }];
  if (data.past.length) candidates.push({ night: data.past[data.past.length - 1], where: 'past' });
  for (const c of candidates) {
    if (!c.night.events.some(e => e.type === 'drink') || c.night.reportClosed) continue;
    const { wake } = simulateNight({ profile: data.profile, events: c.night.events, now });
    if (now >= wake && now < wake + REPORT_HOURS * HOUR) return c;
  }
  return null;
}

const FEEL_COLORS = [colors.good, '#a6d86a', colors.gold, colors.warn, colors.bad];

export function MorningReport({ night, profile, now, showCalories, onFeel, onClose }: {
  night: SavedNight; profile: Profile; now: number; showCalories: boolean;
  onFeel: (f: Feel) => void; onClose: () => void;
}) {
  const s = summarizeNight(profile, night.events);
  if (!s) return null;
  const sim = simulateNight({ profile, events: night.events, now });
  const running = effects(sim, { calories: showCalories }).debuffs.filter(e => e.start <= now && e.end > now);
  const spent = night.events.reduce((t, e) => t + (e.type === 'drink' ? e.cost ?? 0 : 0), 0);
  const std = standardDrinks(s.grams, profile.region);
  const lowHp = Math.round(hpFromBac(s.peak));

  const stats: [string, string][] = [
    ['Drinks', `${s.drinks} · ${std.toFixed(1)} std`],
    ['Lowest HP', s.critical ? '0 (critical)' : String(lowHp)],
    ['Sleep', s.sleepHoursAffected > 0 ? `${s.sleepHoursAffected.toFixed(1)} h affected` : 'Not affected'],
    ['HRV', s.hrvDropPct != null ? `≈ −${s.hrvDropPct}% overnight` : 'Likely normal'],
  ];
  if (spent > 0) stats.push(['Spent', money(Math.round(spent * 100) / 100)]);
  if (showCalories) stats.push(['Calories', `${s.kcal} kcal`]);

  return (
    <View style={[panel, styles.card]}>
      <View style={styles.head}>
        <Text style={styles.title}>Morning report</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the morning report" hitSlop={8}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>
      <Text style={styles.sub}>{new Date(s.start).toLocaleDateString([], { weekday: 'long' })} night</Text>

      <View style={styles.grid}>
        {stats.map(([k, v]) => (
          <View key={k} style={styles.stat}>
            <Text style={styles.statK}>{k}</Text>
            <Text style={styles.statV}>{v}</Text>
          </View>
        ))}
      </View>

      {s.critical ? <Text style={styles.crit}>You reached critical last night. Your body is still under strain, so go easy today.</Text> : null}
      {running.length ? (
        <Text style={styles.body}>
          <Text style={styles.bold}>Still running: </Text>
          {running.map(e => `${EFFECT_NAMES[e.id]} (${duration(e.end - now)})`).join(', ')}
        </Text>
      ) : <Text style={styles.body}>All of last night's debuffs have worn off.</Text>}

      {night.feel == null ? (
        <>
          <Text style={styles.q}>How do you feel?</Text>
          <View style={styles.feels} accessibilityRole="radiogroup" accessibilityLabel="How do you feel">
            {FEELS.map((f, i) => (
              <Pressable key={f} onPress={() => onFeel(i as Feel)} style={[styles.feel, { borderBottomColor: FEEL_COLORS[i] }]} accessibilityRole="radio">
                <Text style={styles.feelTxt}>{f}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>Your answers build up in History, so you can see how many drinks your mornings can take.</Text>
        </>
      ) : (
        <Text style={styles.body}>
          You said <Text style={[styles.bold, { color: FEEL_COLORS[night.feel] }]}>{FEELS[night.feel]}</Text>. Thanks, it's in History.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 10, borderColor: colors.gold },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 21, color: colors.gold },
  close: { fontSize: 22, color: colors.inkDim, paddingHorizontal: 6 },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, marginTop: -6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stat: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.sunk, padding: 9, gap: 2 },
  statK: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, color: colors.inkDim, textTransform: 'uppercase' },
  statV: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  crit: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.bad },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 20 },
  bold: { fontFamily: fonts.bodyBold },
  q: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, marginTop: 4 },
  feels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  feel: { flexGrow: 1, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.edgeHi, borderBottomWidth: 5 },
  feelTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint },
});
