// The safety check-in shown in the Wasted zone (0.15%+) and at 0 HP. Calm, practical, never a "game over".
import { useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RegionCode } from '../../../engine/src/index.ts';
import { fonts } from '../theme';

const EMERGENCY: Record<RegionCode, string> = { ca: '911', us: '911', uk: '999', au: '000', eu: '112' };

const FRIEND_MESSAGE = "I've had a lot to drink and I'm not feeling safe on my own. Can you come and be with me, or call me?";

function smsLink(body: string) {
  // iOS and Android expect the message body slightly differently.
  return Platform.OS === 'ios' ? `sms:&body=${encodeURIComponent(body)}` : `sms:?body=${encodeURIComponent(body)}`;
}

export function SafetyCheck({ visible, region, critical, onWithSomeone }: { visible: boolean; region: RegionCode; critical: boolean; onWithSomeone: () => void }) {
  const insets = useSafeAreaInsets();
  const [notYet, setNotYet] = useState(false);
  const number = EMERGENCY[region];
  const open = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => {}}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <ScrollView contentContainerStyle={styles.card}>
          <Text style={styles.title}>Time to stop and check in</Text>
          <Text style={styles.body}>{critical
            ? 'Your estimated level is in a range where alcohol poisoning is a real risk. Stop drinking now.'
            : "You're likely very drunk by now, even though your health isn't at 0 yet. Blackouts, falls and vomiting are common in this range. Time to switch to water."}</Text>

          {!notYet ? (
            <>
              <Text style={styles.question}>Is someone sober with you?</Text>
              <View style={styles.row}>
                <Pressable onPress={() => { setNotYet(false); onWithSomeone(); }} style={[styles.btn, styles.btnCalm]} accessibilityRole="button">
                  <Text style={styles.btnTxt}>Yes, I'm with someone</Text>
                </Pressable>
                <Pressable onPress={() => setNotYet(true)} style={styles.btn} accessibilityRole="button">
                  <Text style={styles.btnTxt}>Not yet</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.question}>Get someone with you</Text>
              <Pressable onPress={() => open(smsLink(FRIEND_MESSAGE))} style={[styles.btn, styles.btnCalm, styles.wide]} accessibilityRole="button"
                accessibilityHint="Opens Messages with a message ready. You choose who to send it to.">
                <Text style={styles.btnTxt}>Text a friend</Text>
              </Pressable>
              <Text style={styles.small}>Opens Messages with this ready to send: "{FRIEND_MESSAGE}" You choose who it goes to.</Text>
              <Pressable onPress={() => open(`tel:${number}`)} style={[styles.btn, styles.btnUrgent, styles.wide]} accessibilityRole="button">
                <Text style={styles.btnTxt}>Call {number}</Text>
              </Pressable>
              <Pressable onPress={() => { setNotYet(false); onWithSomeone(); }} accessibilityRole="button">
                <Text style={styles.link}>Someone's with me now</Text>
              </Pressable>
            </>
          )}

          <View style={styles.signs}>
            <Text style={styles.signsTitle}>Call {number} if you or anyone notices</Text>
            {[
              "Confusion, or can't stay awake or be woken",
              'Vomiting while drowsy or passed out',
              'Slow or irregular breathing (fewer than 8 breaths a minute)',
              'Pale or blue-tinged skin, or feeling very cold',
              'A seizure',
            ].map(s => <Text key={s} style={styles.sign}>•  {s}</Text>)}
          </View>
          <Text style={styles.body}>If someone is drowsy, lay them on their side and stay with them. Coffee and cold showers don't help.</Text>
          <Text style={styles.small}>This check-in comes back every 30 minutes while your level stays this high.</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(9,7,14,0.92)', paddingHorizontal: 16, justifyContent: 'center' },
  card: { backgroundColor: '#1e2a33', borderWidth: 3, borderColor: '#3f6275', padding: 18, gap: 12, width: '100%', maxWidth: 480, alignSelf: 'center' },
  title: { fontFamily: fonts.display, fontSize: 27, letterSpacing: 0.4, color: '#e9f6ff' },
  body: { fontFamily: fonts.body, fontSize: 15, color: '#cfe3ef', lineHeight: 21 },
  question: { fontFamily: fonts.bodyBold, fontSize: 17, color: '#ffffff', marginTop: 4 },
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 13, paddingHorizontal: 8, alignItems: 'center', backgroundColor: '#14202a', borderWidth: 2, borderColor: '#3f6275' },
  wide: { flex: 0 },
  btnCalm: { backgroundColor: '#2b5c75', borderColor: '#6fa8c4' },
  btnUrgent: { backgroundColor: '#b3132b', borderColor: '#ff6a6f' },
  btnTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#ffffff', textAlign: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#9fd4f0', textAlign: 'center', textDecorationLine: 'underline', paddingVertical: 6 },
  small: { fontFamily: fonts.body, fontSize: 12.5, color: '#9fc0d2', lineHeight: 18 },
  signs: { backgroundColor: '#14202a', padding: 12, gap: 4 },
  signsTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#9fc0d2', letterSpacing: 0.3 },
  sign: { fontFamily: fonts.body, fontSize: 14, color: '#cfe3ef', lineHeight: 20 },
});
