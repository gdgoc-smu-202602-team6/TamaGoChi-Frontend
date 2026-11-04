import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GameColors } from '@/constants/theme';
import { svgSource } from '@/utils/pixel-art';

// Chunky 7×9 glyphs (2-pixel strokes, 3-pixel counters) for the v4 timer and reward numbers.
// Each glyph is cached as its own image so a ticking clock only swaps sources.
const glyphs: Record<string, readonly string[]> = {
  '0': ['.11111.', '11...11', '11...11', '11...11', '11...11', '11...11', '11...11', '11...11', '.11111.'],
  '1': ['...11..', '..111..', '.1111..', '...11..', '...11..', '...11..', '...11..', '...11..', '.111111'],
  '2': ['.11111.', '11...11', '.....11', '....11.', '...11..', '..11...', '.11....', '11.....', '1111111'],
  '3': ['111111.', '.....11', '.....11', '..1111.', '.....11', '.....11', '.....11', '11...11', '.11111.'],
  '4': ['....11.', '...111.', '..1111.', '.11.11.', '11..11.', '1111111', '....11.', '....11.', '....11.'],
  '5': ['1111111', '11.....', '11.....', '111111.', '.....11', '.....11', '.....11', '11...11', '.11111.'],
  '6': ['.11111.', '11.....', '11.....', '111111.', '11...11', '11...11', '11...11', '11...11', '.11111.'],
  '7': ['1111111', '.....11', '....11.', '....11.', '...11..', '...11..', '..11...', '..11...', '..11...'],
  '8': ['.11111.', '11...11', '11...11', '.11111.', '11...11', '11...11', '11...11', '11...11', '.11111.'],
  '9': ['.11111.', '11...11', '11...11', '11...11', '.111111', '.....11', '.....11', '.....11', '.11111.'],
  ':': ['..', '..', '11', '11', '..', '11', '11', '..', '..'],
  '+': ['......', '..11..', '..11..', '111111', '111111', '..11..', '..11..', '......', '......'],
};
const ROWS = 9, PAD = 1, HEIGHT = ROWS + PAD * 2;

type Tone = 'light' | 'dark';
const tones: Record<Tone, { outline: string; top: string; bottom: string }> = {
  light: { outline: GameColors.ink, top: GameColors.yellow, bottom: GameColors.orange },
  dark: { outline: '#0F0E24', top: GameColors.yellow, bottom: GameColors.orange },
};
const cache = new Map<string, { source: string; width: number }>();
function glyph(char: string, tone: Tone) {
  const key = `${tone}:${char}`, cached = cache.get(key);
  if (cached) return cached;
  const rows = glyphs[char] ?? glyphs['0'], width = rows[0].length + PAD * 2, colors = tones[tone];
  const lit = new Set<string>(), outline = new Set<string>();
  rows.forEach((row, y) => Array.from(row).forEach((pixel, x) => { if (pixel === '1') lit.add(`${x + PAD},${y + PAD}`); }));
  // A one-pixel outline around every stroke, including the inside of counters, like the mockup digits.
  for (const cell of lit) {
    const [x, y] = cell.split(',').map(Number);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const near = `${x + dx},${y + dy}`; if (!lit.has(near)) outline.add(near); }
  }
  const rect = (cell: string, fill: string) => { const [x, y] = cell.split(','); return `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`; };
  const face = [...lit].map(cell => rect(cell, Number(cell.split(',')[1]) - PAD < 5 ? colors.top : colors.bottom));
  const entry = { source: svgSource([...outline].map(cell => rect(cell, colors.outline)).join('') + face.join(''), width, HEIGHT), width };
  cache.set(key, entry);
  return entry;
}

/** Pixel-art number. The text value is exposed through `label`; the glyph images are decorative. */
/** Fills the available width (shrinking to fit) unless `inline`, which keeps the requested height. */
export function PixelNumber({ value, label, height = 64, tone = 'light', inline = false }: { value: string; label: string; height?: number; tone?: Tone; inline?: boolean }) {
  const [available, setAvailable] = useState<number | null>(null);
  const chars = Array.from(value).map(char => glyph(char, tone));
  // Neighbouring glyphs share one outline column.
  const units = chars.reduce((sum, one) => sum + one.width, 0) - Math.max(0, chars.length - 1);
  const unit = Math.min(height / HEIGHT, !inline && available ? available / units : Infinity);
  return <View accessible accessibilityRole="text" accessibilityLabel={label} style={inline ? undefined : styles.wrap} onLayout={inline ? undefined : event => setAvailable(event.nativeEvent.layout.width)}>
    <View style={styles.row}>{chars.map((one, index) => <Image key={index} source={one.source} contentFit="fill" accessible={false} style={{ width: one.width * unit, height: HEIGHT * unit, marginLeft: index ? -unit : 0 }} />)}</View>
  </View>;
}
const styles = StyleSheet.create({ wrap: { width: '100%', alignItems: 'center' }, row: { flexDirection: 'row' } });
