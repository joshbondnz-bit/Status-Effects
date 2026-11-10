import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

/**
 * A scrolling screen that starts below the phone's status bar (clock, signal, notch),
 * so content and sticky headers never slide underneath it.
 */
export function Screen({ children, stickyHeaderIndices, keyboardShouldPersistTaps }: {
  children: ReactNode;
  stickyHeaderIndices?: number[];
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        stickyHeaderIndices={stickyHeaderIndices}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
});
