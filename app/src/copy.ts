// All user-facing wording for Tonight. The engine returns numbers; this turns them into words.
import { REGIONS, standardDrinks, type Effect, type EffectId, type Night, type RegionCode } from '../../engine/src/index.ts';
import { clock, duration } from './format';

export const PHASE_COPY = [
  'No meaningful alcohol in your blood.',
  'Relaxed and chattier. If this is still in your system at bedtime, your sleep takes a hit.',
  'Judgment and coordination are slipping and risk-taking goes up. At 0.05% most Canadian provinces issue roadside suspensions.',
  'Over the 0.08% criminal driving limit in Canada and the US. Balance, reaction time and speech are impaired.',
  'A hangover is very likely tomorrow, along with a dip in mood and focus.',
  'Memory gaps and vomiting are likely. Switch to water and stay with people you trust.',
  'Risk of alcohol poisoning. Stop drinking and make sure someone sober is with you.',
];

export const EFFECT_NAMES: Record<EffectId, string> = {
  judgment: 'Impaired judgment', sleep: 'Impaired sleep', hrv: 'HRV drain', dehydration: 'Dehydration',
  hangover: 'Hangover', hangxiety: 'Hangxiety', recovery: 'Slow recovery', fatpause: 'Fat burning paused',
  munchies: 'Munchies', hydrated: 'Hydrated', lined: 'Well fed', pace: 'Steady pace', called: 'Called it',
  strain: 'Body under strain',
};

export function severityLabel(e: Effect): string {
  if (e.kind === 'buff') return 'BUFF';
  const words = e.id === 'hangover' ? ['POSSIBLE', 'LIKELY', 'SEVERE'] : ['MINOR', 'MODERATE', 'SEVERE'];
  const sev = e.severity == null ? 'ACTIVE' : words[e.severity];
  return e.status === 'incoming' ? 'INCOMING · ' + sev : sev;
}

export function describe(e: Effect, n: Night, region: RegionCode): string {
  const unit = REGIONS[region].unitLabel;
  switch (e.id) {
    case 'judgment': return `Slower reactions and bolder decisions until about ${clock(e.end)}. This is an estimate, not a driving clearance. Don't drive tonight.`;
    case 'sleep': return n.bedGrams > 0.5
      ? `You'll still have about ${standardDrinks(n.bedGrams, region).toFixed(1)} ${unit} of alcohol in your system at your ${clock(n.bed)} bedtime, not cleared until around ${clock(n.soberAt)}. That cuts REM sleep and breaks up the second half of the night.`
      : `You should be near zero by your ${clock(n.bed)} bedtime, which softens the hit. Another drink would push alcohol into your sleep.`;
    case 'hrv': return `Overnight heart-rate variability recovery drops roughly ${e.data?.dropPct}% at this intake. Expect a higher resting heart rate tomorrow.`;
    case 'dehydration': return `Alcohol blocks the hormone that helps your kidneys hold onto water. ${e.data?.waters} water for ${e.data?.drinks} drinks so far.`;
    case 'hangover': return `Hangovers peak as your level returns to zero, around ${clock(e.start)}. Estimated peak for the night: ${n.peak.toFixed(2)}%.`;
    case 'hangxiety': return "Next-day anxiety and low mood as your brain rebounds from alcohol's calming effect.";
    case 'recovery': return 'Heavy drinking slows how your muscles rebuild after exercise by roughly a quarter to a third. Go easy on hard training.';
    case 'fatpause': return `Your body clears alcohol before anything else, so fat burning drops sharply until it's gone. Paused for about ${duration(e.data?.pausedMs ?? 0)} tonight.`;
    case 'munchies': return 'Alcohol raises appetite and lowers restraint. Late-night food is often the bigger calorie hit.';
    case 'hydrated': return "Water offsets fluid loss and shortens Dehydration, and it spaces out your drinks. It doesn't lower your blood alcohol or slow the damage; only time does that.";
    case 'strain': return e.status === 'incoming'
      ? `On your current drinks, your level is heading for the critical range around ${clock(e.start)}. Stop drinking now and switch to water.`
      : 'Your blood alcohol reached a dangerous level. Your heart, liver and brain take two days or more to recover from a night like this. Rest, eat and hydrate, and avoid alcohol until this clears.';
    case 'lined': return 'Food slows absorption, so you get a lower, later peak.';
    case 'pace': return `Your liver clears about ${Math.round(e.data?.gramsClearedPerHour ?? 0)} g of alcohol an hour, so gaps let it catch up.`;
    case 'called': return 'You called it before bedtime. Less alcohol in your system at bedtime means better sleep.';
  }
}
