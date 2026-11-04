import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { GameColors, GameUi } from '@/constants/theme';

/**
 * Filter chips. `primary` is a category filter (solid navy when selected); `secondary` is the quieter
 * subcategory row shown under it, so the two levels read as parent and child.
 */
export function FilterChips({ label, options, value, onChange, disabled, level = 'primary' }: { label: string; options: readonly { id: string; name: string }[]; value: string; onChange: (id: string) => void; disabled?: boolean; level?: 'primary' | 'secondary' }) {
  const secondary = level === 'secondary';
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel={label}>
    {options.map(option => {
      const selected = option.id === value;
      return <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={`${label} ${option.name}`} accessibilityState={{ selected, disabled }} disabled={disabled} hitSlop={{ top: 6, bottom: 6 }} onPress={() => onChange(option.id)} style={[styles.chip, secondary && styles.secondaryChip, selected && (secondary ? styles.secondarySelected : styles.selected), disabled && styles.disabled]}>
        <Text style={[styles.text, secondary && styles.secondaryText, selected && !secondary && styles.selectedText]}>{option.name}</Text>
      </Pressable>;
    })}
  </ScrollView>;
}
const styles = StyleSheet.create({
  row: { gap: 6, paddingVertical: 4 },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 13, borderWidth: 1.5, borderColor: GameColors.border, backgroundColor: GameColors.paper, borderRadius: GameUi.radius.badge },
  // The current filter is the solid navy chip, as in the v4 notice list.
  selected: { backgroundColor: GameColors.ink },
  secondaryChip: { minHeight: 32, paddingHorizontal: 11, borderColor: 'transparent', backgroundColor: 'rgba(255, 255, 255, 0.6)' },
  secondarySelected: { backgroundColor: GameColors.yellowLight, borderColor: GameColors.ink },
  text: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: GameColors.ink },
  secondaryText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  selectedText: { color: GameColors.paper },
  disabled: { opacity: .55 },
});
