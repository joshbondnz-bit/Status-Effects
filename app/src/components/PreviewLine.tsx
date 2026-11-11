// "−12 HP · Into Drunk" — what a drink would do, shown before it's logged.
import { StyleSheet, Text, View } from 'react-native';
import { PHASES, type DrinkPreview } from '../../../engine/src/index.ts';
import { useColors, makeStyles, type Palette, fonts } from '../theme';
import { duration } from '../format';

/** The zone warning for a preview, if the drink would push you into a worse zone. */
export function zoneWarning(p: DrinkPreview, colors: Palette): { text: string; color: string } | null {
  if (p.critical) return { text: 'Would take you to 0 HP', color: colors.bad };
  if (p.zoneAfter > p.zoneBefore && p.zoneAfter >= 1) {
    return { text: `Takes you into ${PHASES[p.zoneAfter].name}`, color: p.zoneAfter >= 5 ? colors.bad : p.zoneAfter >= 3 ? colors.warn : colors.inkDim };
  }
  return null;
}

export const hpText = (p: DrinkPreview) => (p.hpLoss >= 0.5 ? `−${Math.round(p.hpLoss)} HP` : '−0 HP');

export function PreviewLine({ p, big }: { p: DrinkPreview; big?: boolean }) {
  const colors = useColors();
  const styles = useStyles(colors);
  const warn = zoneWarning(p, colors);
  return (
    <View style={{ gap: 2 }}>
      <Text style={[styles.hp, big && { fontSize: 22 }]}>≈ {hpText(p)} <Text style={styles.sub}>once absorbed{p.addedRecovery > 60_000 ? ` · +${duration(p.addedRecovery)} until clear` : ''}</Text></Text>
      {warn ? <Text style={[styles.warn, { color: warn.color }]}>⚠ {warn.text}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  hp: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#ff6a6f' },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkDim },
  warn: { fontFamily: fonts.bodyBold, fontSize: 13.5 },
}));
