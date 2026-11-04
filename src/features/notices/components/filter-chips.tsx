import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { GameColors, GameUi } from '@/constants/theme';

export function FilterChips({ label, options, value, onChange, disabled }: { label: string; options: readonly { id: string; name: string }[]; value: string; onChange: (id: string) => void; disabled?: boolean }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel={label}>
    {options.map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={`${label} ${option.name}`} accessibilityState={{ selected: option.id === value, disabled }} disabled={disabled} onPress={() => onChange(option.id)} style={[styles.chip, option.id === value && styles.selected]}>
      <Text style={styles.text}>{option.name}</Text>
    </Pressable>)}
  </ScrollView>;
}
const styles = StyleSheet.create({
  row: { gap: 6, paddingVertical: 4 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderWidth: GameUi.borderWidth, borderColor: GameColors.border, backgroundColor: GameColors.paper, borderRadius: GameUi.radius.badge },
  selected: { backgroundColor: GameColors.yellow },
  text: { ...GameUi.typography.body, fontWeight: '600', color: GameColors.ink },
});
