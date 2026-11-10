// The morning-after "how do you feel?" check-in, and how it lines up with how much was drunk.

/** 0 = great … 4 = wrecked. */
export type Feel = 0 | 1 | 2 | 3 | 4;
export const FEELS = ['Great', 'Fine', 'Meh', 'Rough', 'Wrecked'] as const;

export interface FeelBucket {
  label: string;
  nights: number;
  /** Average feel (0 = great … 4 = wrecked), or null with no check-ins. */
  avg: number | null;
}

const BUCKETS = [
  { label: '1–2 drinks', below: 2.5 },
  { label: '3–4 drinks', below: 4.5 },
  { label: '5–6 drinks', below: 6.5 },
  { label: '7+ drinks', below: Infinity },
];

/** Average morning feel grouped by standard drinks the night before. */
export function feelVsDrinks(entries: { std: number; feel: number }[]): FeelBucket[] {
  return BUCKETS.map((b, i) => {
    const lo = i === 0 ? -Infinity : BUCKETS[i - 1].below;
    const hits = entries.filter(e => e.std >= lo && e.std < b.below);
    return { label: b.label, nights: hits.length, avg: hits.length ? hits.reduce((s, e) => s + e.feel, 0) / hits.length : null };
  });
}

/** The nearest feel word for an average, e.g. 2.6 → "Rough". */
export const feelWord = (avg: number) => FEELS[Math.min(4, Math.max(0, Math.round(avg)))];
