import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, makeStyles, type Palette } from '../theme';
import { Sky } from './Sky';

/**
 * A scrolling screen that starts below the phone's status bar (clock, signal, notch),
 * so content and sticky headers never slide underneath it. The pixel sky sits behind it all.
 */
export function Screen({ children, stickyHeaderIndices, keyboardShouldPersistTaps }: {
  children: ReactNode;
  stickyHeaderIndices?: number[];
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
}) {
  const colors = useColors();
  const styles = useStyles(colors);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Sky />
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

const useStyles = makeStyles((colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
}));
