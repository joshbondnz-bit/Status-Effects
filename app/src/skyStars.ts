// Made by scripts/make-sky.mjs: where the twinkling stars sit on each sky, as fractions of its width and height.
export const SKY_ART = { width: 100, height: 214 } as const;
export const SKY_STARS: Record<'night' | 'dawn' | 'day' | 'morning', [number, number][]> = {"night":[[0.49,0.2009],[0.19,0.0187],[0.3,0.3505],[0.89,0.2009],[0.18,0.1308],[0.51,0.0981],[0.62,0.1262]],"dawn":[[0.49,0.2009],[0.19,0.0187],[0.64,0],[0.67,0.2336]],"day":[],"morning":[]};
