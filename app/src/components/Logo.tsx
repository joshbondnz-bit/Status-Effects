// The Status Effects logo: the emblem (heart and sword, as on the app icon) with the wordmark and a small,
// partly drained HP bar. Stacked for the start of setup; horizontal for the About card.
import { Text, View } from 'react-native';
import { PixelSprite } from './PixelSprite';
import { EMBLEM } from '../sprites';
import { useColors, makeStyles, type Palette, fonts, isDark } from '../theme';

export function Logo({ layout = 'horizontal', size = 1 }: { layout?: 'horizontal' | 'stacked'; size?: number }) {
  const colors = useColors();
  const styles = useStyles(colors);
  const stacked = layout === 'stacked';
  const emblem = (stacked ? 92 : 64) * size;
  return (
    <View style={[styles.wrap, stacked && styles.stacked]} accessible accessibilityRole="image" accessibilityLabel="Status Effects">
      <PixelSprite sprite={EMBLEM} scale={emblem / EMBLEM.rows.length} />
      <View style={[styles.words, { alignItems: stacked ? 'center' : 'flex-start' }]}>
        <Text style={[styles.wordmark, { fontSize: 40 * size, lineHeight: 40 * size }]}>Status Effects</Text>
        {/* Seven of ten HP segments: the app's main mechanic, in miniature. */}
        <View style={styles.bar}>
          {Array.from({ length: 10 }, (_, i) => (
            <View key={i} style={[styles.seg, { width: 12 * size, height: 5 * size }, i === 0 ? styles.segHi : i < 7 ? styles.segOn : styles.segOff]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors: Palette) => ({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stacked: { flexDirection: 'column', gap: 10 },
  words: { gap: 6 },
  // Cream lettering with a gold pixel drop shadow (dark ink on the light theme).
  wordmark: { fontFamily: fonts.display, letterSpacing: 1, color: colors.ink, textShadowColor: isDark(colors) ? '#a87a22' : '#d2a414', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  bar: { flexDirection: 'row', gap: 2, padding: 2, backgroundColor: colors.edge },
  seg: {},
  segHi: { backgroundColor: colors.hpHi },
  segOn: { backgroundColor: colors.hp },
  segOff: { backgroundColor: colors.track2 },
}));
