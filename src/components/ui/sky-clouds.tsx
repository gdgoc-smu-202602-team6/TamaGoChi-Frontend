import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

import { GameColors } from '@/constants/theme';
import { pixelArtSource } from '@/utils/pixel-art';

// The v4 mockup's 16×7 cloud: navy outline, white body and a row of light-blue dots.
const cloud = pixelArtSource([
  '......KKKK......',
  '....KKWWWWKK....',
  '..KKWWWWWWWWK...',
  '.KWWWWWWWWWWWKK.',
  'KWWWWWWWWWWWWWWK',
  'KWCWWWCWWWCWWWCK',
  '.KKKKKKKKKKKKKK.',
], { K: GameColors.ink, W: GameColors.paper, C: '#9FD8FF' });

// Size, height and drift speed from the mockup. `start` is how far along its path a cloud begins,
// so the three are spread across the sky on first paint instead of entering together.
const clouds = [
  { width: 64, top: 120, seconds: 38, start: 8 / 38, opacity: 1 },
  { width: 48, top: 210, seconds: 52, start: 30 / 52, opacity: .9 },
  { width: 80, top: 360, seconds: 64, start: 44 / 64, opacity: 1 },
] as const;

/**
 * Pixel clouds drifting left to right behind a tab screen's content. Decorative only: hidden from
 * screen readers, ignores touches, and holds still when the system asks for reduced motion.
 * Render it as the first child of the screen so the header and cards draw over it.
 */
export function SkyClouds() {
  const { width } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduceMotion(value); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { alive = false; sub.remove(); };
  }, []);
  return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    {clouds.map(one => <Cloud key={one.top} {...one} screen={width} still={reduceMotion} />)}
  </View>;
}

function Cloud({ width, top, seconds, start, opacity, screen, still }: (typeof clouds)[number] & { screen: number; still: boolean }) {
  const [progress] = useState(() => new Animated.Value(start));
  useEffect(() => {
    if (still) return;
    let stopped = false;
    const pass = (from: number) => {
      progress.setValue(from);
      Animated.timing(progress, { toValue: 1, duration: seconds * 1000 * (1 - from), easing: Easing.linear, useNativeDriver: true })
        .start(({ finished }) => { if (finished && !stopped) pass(0); });
    };
    pass(start);
    return () => { stopped = true; progress.stopAnimation(); };
  }, [progress, seconds, start, still]);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-width, screen] });
  return <Animated.View style={[styles.cloud, { top, width, height: width * 7 / 16, opacity, transform: [{ translateX }] }]}>
    <Image source={cloud} contentFit="fill" style={StyleSheet.absoluteFill} accessible={false} />
  </Animated.View>;
}

const styles = StyleSheet.create({
  cloud: { position: 'absolute', left: 0 },
});
