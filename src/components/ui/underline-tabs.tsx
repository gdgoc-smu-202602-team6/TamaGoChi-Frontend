import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GameColors } from '@/constants/theme';

type Tab = { id: string; name: string; badge?: ReactNode; hint?: string; describedBy?: string; description?: string };

/** Top-level context switch (for example, the club) shown in the top bar, one level above filter chips. */
export function UnderlineTabs({ label, tabs, value, onChange, disabled }: { label: string; tabs: readonly Tab[]; value: string; onChange: (id: string) => void; disabled?: boolean }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist" accessibilityLabel={label}>
    {tabs.map(tab => {
      const selected = tab.id === value;
      return <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={`${label} ${tab.name}`} accessibilityHint={tab.hint} aria-describedby={tab.describedBy} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => onChange(tab.id)} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
        <View style={styles.label}><Text numberOfLines={1} style={[styles.text, selected && styles.selectedText]}>{tab.name}</Text>{tab.badge}</View>
        <View style={[styles.indicator, selected && styles.selectedIndicator]} />
        {tab.description && <Text nativeID={tab.describedBy} style={styles.hidden}>{tab.description}</Text>}
      </Pressable>;
    })}
  </ScrollView>;
}
const styles = StyleSheet.create({
  row: { paddingHorizontal: 4, gap: 4 },
  tab: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'flex-end' },
  pressed: { opacity: .7 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 9 },
  text: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: GameColors.ink, opacity: .72 },
  selectedText: { fontWeight: '900', opacity: 1 },
  indicator: { height: 4, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: 'transparent' },
  selectedIndicator: { backgroundColor: GameColors.ink },
  hidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
