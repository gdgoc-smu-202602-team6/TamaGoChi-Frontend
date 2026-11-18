import { Image } from 'expo-image';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { GameColors } from '@/constants/theme';
import { svgSource } from '@/utils/pixel-art';

/**
 * The v4 mockup's ground under the floating tab bar: a grass edge, a navy line and dirt with small
 * square pebbles. Drawn as one SVG at the real pixel width so the pebbles never stretch.
 * Decorative only; replace the drawing here if the designer delivers a ground asset.
 */
export function GroundStrip({ height }: { height: number }) {
  const { width: screen } = useWindowDimensions();
  const width = Math.max(1, Math.ceil(screen));
  const dirtTop = 17;
  // Pebbles are plain rects on a 14×12 grid: native SVG decoders do not all support <pattern>.
  const pebbles: string[] = [];
  for (let y = dirtTop + 9; y < height - 1; y += 12) {
    for (let x = 6; x < width; x += 14) pebbles.push(`<rect x="${x}" y="${y}" width="2" height="2"/>`);
  }
  const content = [
    `<rect width="${width}" height="9" fill="${GameColors.green}"/>`,
    `<rect y="9" width="${width}" height="5" fill="${GameColors.grassDark}"/>`,
    `<rect y="14" width="${width}" height="3" fill="${GameColors.ink}"/>`,
    `<rect y="${dirtTop}" width="${width}" height="${Math.max(0, height - dirtTop)}" fill="${GameColors.dirt}"/>`,
    `<g fill="${GameColors.pebble}" fill-opacity=".8">${pebbles.join('')}</g>`,
  ].join('');
  return <Image source={{ uri: svgSource(content, width, height) }} contentFit="fill" accessible={false} pointerEvents="none"
    style={[styles.ground, { width, height }]} />;
}

const styles = StyleSheet.create({
  ground: { position: 'absolute', left: 0, bottom: 0 },
});
