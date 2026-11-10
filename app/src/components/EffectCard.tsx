import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Effect, Night, RegionCode } from '../../../engine/src/index.ts';
import { colors, fonts } from '../theme';
import { ICONS } from '../sprites';
import { PixelSprite } from './PixelSprite';
import { EFFECT_NAMES, describe, severityLabel } from '../copy';
import { duration } from '../format';

export function EffectCard({ effect: e, night, region }: { effect: Effect; night: Night; region: RegionCode }) {
  const [open, setOpen] = useState(false);
  const now = night.now;
  const fill = e.status !== 'active' ? 1 : Math.max(0.06, Math.min(1, (e.end - now) / Math.max(1, e.end - e.start)));
  const sevColor = e.kind === 'buff' ? colors.good : e.severity === 2 ? colors.bad : e.severity === 1 ? colors.warn : colors.inkDim;
  const time = e.status === 'incoming' ? `in ${duration(e.start - now)}` : e.status === 'ongoing' ? 'Active' : `${duration(e.end - now)} left`;

  return (
    <Pressable
      onPress={() => setOpen(o => !o)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${EFFECT_NAMES[e.id]}, ${time}, ${severityLabel(e).toLowerCase()}`}
      style={[styles.card, open && styles.open, e.kind === 'buff' && styles.buff, e.status === 'incoming' && styles.incoming]}
    >
      <View style={styles.row}>
        <PixelSprite sprite={ICONS[e.id]} scale={3} fill={fill} dim={e.status === 'incoming'} />
        <View style={styles.text}>
          <Text style={styles.name}>{EFFECT_NAMES[e.id]}</Text>
          <Text style={[styles.sev, { color: sevColor }]}>{severityLabel(e)}</Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>
      {open ? <Text style={styles.desc}>{describe(e, night, region)}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', padding: 10, backgroundColor: colors.panel2, borderWidth: 2, borderColor: colors.edge },
  open: {},
  buff: { borderColor: colors.buffEdge },
  incoming: { backgroundColor: colors.sunk },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  text: { flex: 1, gap: 4 },
  name: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, lineHeight: 19 },
  time: { fontFamily: fonts.num, fontSize: 24, color: colors.ink, textAlign: 'right' },
  sev: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 0.4, alignSelf: 'flex-start', backgroundColor: colors.sunk, paddingHorizontal: 5, paddingVertical: 2 },
  desc: { fontFamily: fonts.body, fontSize: 14, color: colors.inkDim, lineHeight: 20, marginTop: 8 },
});
