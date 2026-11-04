import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GameColors, GameUi } from '@/constants/theme';

/** Segmented bar from the v4 shop and decorate panels: white track with a yellow selected pill. */
export function SegmentedTabs<T extends string>({ options, value, onChange, disabled, label }: { options: readonly { id: T; name: string }[]; value: T; onChange: (id: T) => void; disabled?: boolean; label?: string }) {
  return <View accessibilityRole="tablist" accessibilityLabel={label} style={styles.tabs}>
    {options.map(option => <Pressable key={option.id} accessibilityRole="tab" accessibilityState={{ selected: value === option.id, disabled }} disabled={disabled} onPress={() => onChange(option.id)} style={[styles.tab, value === option.id && styles.selected, disabled && styles.disabled]}>
      <Text numberOfLines={1} style={[styles.text, value === option.id && styles.selectedText]}>{option.name}</Text>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: 4, gap: 2, backgroundColor: GameColors.paper, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: 18 },
  tab: { flex: 1, minHeight: 44, paddingVertical: 8, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', borderRadius: 14 },
  selected: { backgroundColor: GameColors.yellow, borderColor: GameColors.ink },
  disabled: { opacity: .55 },
  text: { ...GameUi.typography.body, color: GameColors.inkMuted, fontWeight: '800' },
  selectedText: { color: GameColors.ink },
});
