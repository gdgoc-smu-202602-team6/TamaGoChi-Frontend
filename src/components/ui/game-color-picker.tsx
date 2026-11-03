import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette, PaletteLabels } from '@/constants/palette';
import { GameColors, GameUi } from '@/constants/theme';
import { paletteColors, type PaletteColor } from '@/types/notice';

export function GameColorPicker({ label, value, disabled, onChange }: { label: string; value: PaletteColor; disabled?: boolean; onChange: (color: PaletteColor) => void }) {
  return <View accessibilityRole="radiogroup" accessibilityLabel={`${label} 색상`} style={styles.colors}>
    {paletteColors.map(color => <Pressable key={color} accessibilityRole="radio" accessibilityLabel={`${label} ${PaletteLabels[color]}`} accessibilityState={{ checked: value === color, disabled }} disabled={disabled} onPress={() => onChange(color)} style={[styles.color, { backgroundColor: Palette[color].background }]}>
      <Text style={[styles.label, { color: Palette[color].text }]}>{value === color ? '✓ ' : ''}{PaletteLabels[color]}</Text>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, color: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 2, borderColor: GameColors.ink, borderRadius: GameUi.radius.badge }, label: { ...GameUi.typography.body, fontWeight: '800' },
});
