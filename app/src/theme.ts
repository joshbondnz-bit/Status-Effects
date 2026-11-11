// Design tokens: a dark "tavern at night" palette and a light "daylight" one, with the same token names.
// Components read the current palette with useColors() and build styles with makeStyles(), so switching
// themes (or the phone switching to dark mode at sunset) restyles everything.
import { createContext, useContext } from 'react';
import { StyleSheet } from 'react-native';

const dark = {
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
  // Calendar heatmap, like a traffic light: alcohol-free green, then yellow-green, yellow, orange, red
  dry: '#3fae74',
  heat1: '#bfd13f',
  heat2: '#f5c431',
  heat3: '#f5862c',
  heat4: '#e5383b',
  heatInk: '#fff6ee',
  /** Day numbers on the lighter heatmap colours. */
  heatInkDark: '#1a1420',
  // Status tray frames: debuff severity (minor, moderate, severe), unrated debuffs, buffs
  sevMinor: '#e8c547',
  sevModerate: '#ff8a3d',
  sevSevere: '#ec3a50',
  sevUnrated: '#8a7aa0',
  buff: '#4cc488',
  // HP ring track (the empty part), and the empty segments of meters
  track1: '#4a2030',
  track2: '#3a1824',
  track3: '#2c1220',
  meterEmpty: '#2a2440',
  // Gentle gold reminder boxes ("set up your character", dev tools)
  nudgeBg: '#3a3220',
  nudgeEdge: '#6a5424',
  // Status tray: the shaded wedge showing time already used
  wedge: 'rgba(11,8,16,0.62)',
  // The Water button
  waterBg: '#22385a',
  waterEdge: '#4a78b8',
  waterEdgeLo: '#14213a',
  waterInk: '#f0e5cd',
};

export type Palette = { [K in keyof typeof dark]: string };

/**
 * Daylight: warm stone and paper, with the same dark pixel outlines so the art still pops.
 * Accent colours are a shade deeper than in the dark theme so text stays readable on light backgrounds.
 */
const light: Palette = {
  bg: '#ece6da',
  panel: '#fbf8f1',
  panel2: '#f2ece1',
  sunk: '#e4ddcf',
  edge: '#2e2540',
  edgeHi: '#b7adc8',
  ink: '#211a2c',
  inkDim: '#56496a',
  inkFaint: '#7f7392',
  hp: '#d9363e',
  hpHi: '#f27a6c',
  hpLo: '#8d1d33',
  hpEmpty: '#f1d4d6',
  gold: '#b98410',
  mana: '#3a5fd0',
  good: '#1f8a56',
  warn: '#c2650f',
  bad: '#cf2638',
  buffEdge: '#8fcdb0',
  alertBg: '#fde4e1',
  alertEdge: '#e39a9e',
  alertInk: '#7a1f26',
  dry: '#3aa56c',
  heat1: '#b5c832',
  heat2: '#f0bd25',
  heat3: '#ef7d22',
  heat4: '#de3236',
  heatInk: '#fff6ee',
  heatInkDark: '#1a1420',
  sevMinor: '#d2a414',
  sevModerate: '#e8721d',
  sevSevere: '#d8304a',
  sevUnrated: '#8a7aa0',
  buff: '#2a9d63',
  track1: '#f3c9cd',
  track2: '#ecb8bd',
  track3: '#e2a6ac',
  meterEmpty: '#ddd5c6',
  nudgeBg: '#fbefcc',
  nudgeEdge: '#d4ad52',
  wedge: 'rgba(46,37,64,0.3)',
  waterBg: '#d9e5fb',
  waterEdge: '#7b9ee0',
  waterEdgeLo: '#4a6db8',
  waterInk: '#1d3570',
};

export const palettes = { dark, light: light as Palette } as const;
export type ThemeName = keyof typeof palettes;

const ThemeContext = createContext<Palette>(dark);
/** Wrap the app in this with the current palette. */
export const ThemeProvider = ThemeContext.Provider;
/** The current palette. */
export function useColors(): Palette {
  return useContext(ThemeContext);
}
/** True when the dark palette is showing (for the status bar, mostly). */
export const isDark = (c: Palette) => c === dark;

/** Styles that depend on the palette, built once per palette and reused. */
/** What StyleSheet.create accepts; typing against it keeps literal style values like 'row' exact. */
type StyleInput = Parameters<typeof StyleSheet.create>[0];

export function makeStyles<T extends StyleInput>(fn: (c: Palette) => T & StyleInput) {
  const cache = new Map<Palette, Readonly<T>>();
  return (c: Palette): Readonly<T> => {
    const hit = cache.get(c);
    if (hit) return hit;
    const s = StyleSheet.create<T>(fn(c));
    cache.set(c, s);
    return s;
  };
}

/** Font family names, as registered by useFonts in the root layout. */
export const fonts = {
  // Jersey 10: chunky pixel headings with clear letter shapes (Pixelify's F read as a P). One weight only.
  display: 'Jersey10_400Regular',
  displayBold: 'Jersey10_400Regular',
  num: 'VT323_400Regular',
  body: 'AtkinsonHyperlegible_400Regular',
  bodyBold: 'AtkinsonHyperlegible_700Bold',
} as const;

/** A pixel-style panel: hard dark outline, no rounded corners. */
export const panelStyles = makeStyles(c => ({
  panel: { backgroundColor: c.panel, borderWidth: 3, borderColor: c.edge },
}));
