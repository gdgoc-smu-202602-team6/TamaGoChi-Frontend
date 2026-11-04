import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { GameColors, GameUi } from '@/constants/theme';

export function FilterChips({ label, options, value, onChange, disabled }: { label: string; options: readonly { id: string; name: string }[]; value: string; onChange: (id: string) => void; disabled?: boolean }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel={label}>
    {options.map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={`${label} ${option.name}`} accessibilityState={{ selected: option.id === value, disabled }} disabled={disabled} hitSlop={{ top: 4, bottom: 4 }} onPress={() => onChange(option.id)} style={[styles.chip, option.id === value && styles.selected, disabled && styles.disabled]}>
      <Text style={[styles.text, option.id === value && styles.selectedText]}>{option.name}</Text>
    </Pressable>)}
  </ScrollView>;
}
const styles = StyleSheet.create({
  row: { gap: 6, paddingVertical: 4 },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderWidth: GameUi.borderWidth, borderColor: GameColors.border, backgroundColor: GameColors.paper, borderRadius: GameUi.radius.badge },
  // The current filter is the solid navy chip, as in the v4 notice list.
  selected: { backgroundColor: GameColors.ink },
  text: { ...GameUi.typography.body, fontWeight: '800', color: GameColors.ink },
  selectedText: { color: GameColors.paper },
  disabled: { opacity: .55 },
});
