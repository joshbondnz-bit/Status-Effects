// The pixel-art sky behind every screen. It sits still while the cards scroll over it.
// Dark theme: a starry night with a moon, turning to dawn in the morning-after hours (5–11am).
// Light theme: a daytime sky with a sun and clouds, warmer in the morning.
// A few stars twinkle slowly in the night sky, unless the phone's Reduce Motion setting is on.
// The images are drawn by scripts/make-sky.mjs.
import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useApp } from '../AppDataProvider';
import { SKY_ART, SKY_STARS } from '../skyStars';
import { isDark, useColors } from '../theme';
import { useAnimatedValue } from '../useAnimatedValue';
import { useReduceMotion } from '../useReduceMotion';

type SkyName = keyof typeof SKY_STARS;
const IMAGES: Record<SkyName, ImageSourcePropType> = {
  night: require('../../assets/sky/night.png'),
  dawn: require('../../assets/sky/dawn.png'),
  day: require('../../assets/sky/day.png'),
  morning: require('../../assets/sky/morning.png'),
};

const NATIVE = Platform.OS !== 'web';
const STAR = '#fff3d6';

/** The morning-after hours, when the sky starts to brighten. */
const isMorning = (t: number) => { const h = new Date(t).getHours(); return h >= 5 && h < 11; };

export function Sky() {
  const colors = useColors();
  const { now } = useApp();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const morning = isMorning(now);
  const name: SkyName = isDark(colors) ? (morning ? 'dawn' : 'night') : (morning ? 'morning' : 'day');
  // The art is scaled to the screen's width and pinned to the top; anything below the screen is cut off.
  const pixel = width / SKY_ART.width;
  const height = pixel * SKY_ART.height;
  return (
    <View style={styles.fill} pointerEvents="none" onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          <Image source={IMAGES[name]} style={{ width, height }} resizeMode="stretch" />
          {!reduceMotion && SKY_STARS[name].map(([x, y], i) => (
            <Twinkle key={`${name}-${i}`} left={x * width} top={y * height} size={pixel} delay={i * 700} />
          ))}
        </>
      ) : null}
    </View>
  );
}

/** One star brightening and dimming, slowly, forever. */
function Twinkle({ left, top, size, delay }: { left: number; top: number; size: number; delay: number }) {
  const glow = useAnimatedValue(0);
  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(glow, { toValue: 0.9, duration: 1800, easing: ease, useNativeDriver: NATIVE }),
      Animated.timing(glow, { toValue: 0, duration: 1800, easing: ease, useNativeDriver: NATIVE }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [glow, delay]);
  return <Animated.View style={{ position: 'absolute', left, top, width: size, height: size, backgroundColor: STAR, opacity: glow }} />;
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
});
