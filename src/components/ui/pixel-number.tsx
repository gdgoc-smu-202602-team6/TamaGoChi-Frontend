import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GameColors } from '@/constants/theme';
import { svgSource } from '@/utils/pixel-art';

// Chunky 5×9 glyphs in the v4 mockup style: 2-pixel strokes, 1-pixel counters (filled by the
// outline, so holes read as dark slots), cut corners, a two-tone face and a drop shadow.
// Each glyph is cached as its own image so a ticking clock only swaps sources.
const glyphs: Record<string, readonly string[]> = {
  '0': ['.111.', '11111', '11.11', '11.11', '11.11', '11.11', '11.11', '11111', '.111.'],
  '1': ['..11.', '.111.', '1111.', '..11.', '..11.', '..11.', '..11.', '11111', '11111'],
  '2': ['1111.', '11111', '...11', '...11', '11111', '11...', '11...', '11111', '11111'],
  '3': ['1111.', '11111', '...11', '...11', '.1111', '...11', '...11', '11111', '1111.'],
  '4': ['11.11', '11.11', '11.11', '11.11', '11111', '11111', '...11', '...11', '...11'],
  '5': ['11111', '11111', '11...', '11...', '11111', '...11', '...11', '11111', '1111.'],
  '6': ['.1111', '11111', '11...', '11...', '11111', '11.11', '11.11', '11111', '.111.'],
  '7': ['11111', '11111', '...11', '...11', '...11', '...11', '...11', '...11', '...11'],
  '8': ['.111.', '11111', '11.11', '11.11', '11111', '11.11', '11.11', '11111', '.111.'],
  '9': ['.111.', '11111', '11.11', '11.11', '11111', '...11', '...11', '11111', '1111.'],
  ':': ['..', '..', '11', '11', '..', '11', '11', '..', '..'],
  '+': ['......', '..11..', '..11..', '111111', '111111', '..11..', '..11..', '......', '......'],
};
const ROWS = 9, PAD = 1, SHADOW = 1, HEIGHT = ROWS + PAD * 2 + SHADOW;

type Tone = 'light' | 'dark';
const tones: Record<Tone, { outline: string; shadow: string; top: string; bottom: string }> = {
  light: { outline: GameColors.ink, shadow: GameColors.ink, top: GameColors.yellow, bottom: GameColors.orange },
  dark: { outline: '#0F0E24', shadow: '#0F0E24', top: GameColors.yellow, bottom: GameColors.orange },
};
const cache = new Map<string, { source: string; width: number }>();
function glyph(char: string, tone: Tone) {
  const key = `${tone}:${char}`, cached = cache.get(key);
  if (cached) return cached;
  const rows = glyphs[char] ?? glyphs['0'], width = rows[0].length + PAD * 2, colors = tones[tone];
  const lit = new Set<string>(), outline = new Set<string>(), shadow = new Set<string>();
  rows.forEach((row, y) => Array.from(row).forEach((pixel, x) => { if (pixel === '1') lit.add(`${x + PAD},${y + PAD}`); }));
  // A one-pixel outline around every stroke (filling the narrow counters), then a one-pixel drop shadow under it.
  for (const cell of lit) {
    const [x, y] = cell.split(',').map(Number);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const near = `${x + dx},${y + dy}`; if (!lit.has(near)) outline.add(near); }
  }
  for (const cell of [...lit, ...outline]) {
    const [x, y] = cell.split(',').map(Number), below = `${x},${y + SHADOW}`;
    if (!lit.has(below) && !outline.has(below)) shadow.add(below);
  }
  const rect = (cell: string, fill: string) => { const [x, y] = cell.split(','); return `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`; };
  const face = [...lit].map(cell => rect(cell, Number(cell.split(',')[1]) - PAD < 5 ? colors.top : colors.bottom));
  const entry = { source: svgSource([...shadow].map(cell => rect(cell, colors.shadow)).join('') + [...outline].map(cell => rect(cell, colors.outline)).join('') + face.join(''), width, HEIGHT), width };
  cache.set(key, entry);
  return entry;
}

/** Pixel-art number. The text value is exposed through `label`; the glyph images are decorative. */
/** Fills the available width (shrinking to fit) unless `inline`, which keeps the requested height. */
export function PixelNumber({ value, label, height = 64, tone = 'light', inline = false }: { value: string; label: string; height?: number; tone?: Tone; inline?: boolean }) {
  const [available, setAvailable] = useState<number | null>(null);
  const chars = Array.from(value).map(char => glyph(char, tone));
  // Each glyph keeps its own outline, so digits read as separate tiles like the mockup.
  const units = chars.reduce((sum, one) => sum + one.width, 0);
  // Whole-pixel cells keep edges crisp and leave no hairline seams between glyph images.
  const unit = Math.max(1, Math.floor(Math.min(height / HEIGHT, !inline && available ? available / units : Infinity)));
  return <View accessible accessibilityRole="text" accessibilityLabel={label} style={inline ? undefined : styles.wrap} onLayout={inline ? undefined : event => setAvailable(event.nativeEvent.layout.width)}>
    <View style={styles.row}>{chars.map((one, index) => <Image key={index} source={one.source} contentFit="fill" accessible={false} style={{ width: one.width * unit, height: HEIGHT * unit, }} />)}</View>
  </View>;
}
const styles = StyleSheet.create({ wrap: { width: '100%', alignItems: 'center' }, row: { flexDirection: 'row' } });
