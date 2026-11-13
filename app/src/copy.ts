// All user-facing wording for Tonight. The engine returns numbers; this turns them into words.
import { REGIONS, phaseIndex, standardDrinks, type Effect, type EffectId, type Night, type RegionCode } from '../../engine/src/index.ts';
import { clock, duration, zoneName as zoneNameOf } from './format';

/** Driving limits by region, for the impaired judgment details, by the night's peak zone (Buzzed, Tipsy, Drunk). */
const DRIVING: Record<RegionCode, { buzzed: string; tipsy: string; drunk: string }> = {
  ca: { buzzed: 'Already over the zero limit for new and young drivers in most provinces.',
    tipsy: 'Most Canadian provinces issue roadside suspensions in this zone.',
    drunk: 'Over the criminal driving limit in Canada.' },
  us: { buzzed: 'Under-21 drivers face zero-tolerance limits in every state.',
    tipsy: "Driving skills are already impaired, and this is over Utah's limit.",
    drunk: 'Over the driving limit in every US state.' },
  uk: { buzzed: 'Driving skills start to slip well before the legal limit.',
    tipsy: "This is over Scotland's driving limit.",
    drunk: 'Over the driving limit in England, Wales and Northern Ireland.' },
  au: { buzzed: 'Learner, provisional and some professional drivers must be at zero.',
    tipsy: "This is over Australia's driving limit.",
    drunk: "Well over Australia's driving limit." },
  nz: { buzzed: 'Drivers under 20 must be at zero, so this is already over their limit.',
    tipsy: "This is over New Zealand's driving limit.",
    drunk: "Well over New Zealand's driving limit." },
  eu: { buzzed: 'New and professional drivers in much of Europe have a 0.02% limit or lower.',
    tipsy: "This is over the driving limit in most of Europe.",
    drunk: 'Over the driving limit everywhere in Europe.' },
};

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
    case 'judgment': {
      const k = phaseIndex(n.peak), d = DRIVING[region];
      const law = k >= 3 ? d.drunk : k === 2 ? d.tipsy : k === 1 ? d.buzzed : '';
      return `Slower reactions and bolder decisions until about ${clock(e.end)}. ${law ? law + ' ' : ''}This is an estimate, not a driving clearance. Don't drive tonight.`;
    }
    case 'sleep': return n.bedGrams > 0.5
      ? `You'll still have about ${standardDrinks(n.bedGrams, region).toFixed(1)} ${unit} of alcohol in your system at your ${clock(n.bed)} bedtime, not cleared until around ${clock(n.soberAt)}. That cuts REM sleep and breaks up the second half of the night.`
      : `You should be near zero by your ${clock(n.bed)} bedtime, which softens the hit. Another drink would push alcohol into your sleep.`;
    case 'hrv': return `Your HRV-based recovery score for early sleep drops by roughly ${e.data?.dropPct} percentage points at this intake. Expect a higher resting heart rate tomorrow.`;
    case 'dehydration': return `Alcohol blocks the hormone that helps your kidneys hold onto water. ${e.data?.waters} water for ${e.data?.drinks} drinks so far.`;
    case 'hangover': return `Hangovers peak as your level returns to zero, around ${clock(e.start)}. Tonight's estimated peak: the ${zoneNameOf(n.peak)} zone.`;
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
