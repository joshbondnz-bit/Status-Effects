// Design tokens, matching the prototype's dark "tavern at night" theme.
// (Light mode comes later, as a second token set.)

export const colors = {
  bg: '#17131f',
  panel: '#252036',
  panel2: '#2f2945',
  sunk: '#1b1728',
  edge: '#0c0912',
  edgeHi: '#4a4170',
  ink: '#f0e5cd',
  inkDim: '#aca2c4',
  inkFaint: '#776e97',
  hp: '#e5484f',
  hpHi: '#ff9a86',
  hpLo: '#8d1d33',
  hpEmpty: '#3a1824',
  gold: '#f2c14e',
  mana: '#6f93ff',
  good: '#5fd39a',
  warn: '#f2a03d',
  bad: '#ff5d62',
  buffEdge: '#2f5a48',
  alertBg: '#3a1f22',
  alertEdge: '#7a3036',
  alertInk: '#ffd7cf',
} as const;

/** Font family names, as registered by useFonts in App.tsx. */
export const fonts = {
  display: 'PixelifySans_600SemiBold',
  displayBold: 'PixelifySans_700Bold',
  num: 'VT323_400Regular',
  body: 'AtkinsonHyperlegible_400Regular',
  bodyBold: 'AtkinsonHyperlegible_700Bold',
} as const;

/** A pixel-style panel: hard dark outline, no rounded corners. */
export const panel = {
  backgroundColor: colors.panel,
  borderWidth: 3,
  borderColor: colors.edge,
} as const;
