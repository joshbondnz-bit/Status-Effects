// An Animated.Value that lives for the life of the component.
// React Native has its own useAnimatedValue, but the web build (used for testing in a browser) doesn't,
// so this is the same idea in one line. Creating it in a state initializer keeps the React rules happy
// (no reading refs while drawing).
import { useState } from 'react';
import { Animated } from 'react-native';

export function useAnimatedValue(initial: number): Animated.Value {
  return useState(() => new Animated.Value(initial))[0];
}
