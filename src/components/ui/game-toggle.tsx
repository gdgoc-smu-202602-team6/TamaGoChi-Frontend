import { StyleSheet, Switch, Text, View } from 'react-native';

import { GameColors, GameUi } from '@/constants/theme';

export function GameToggle({ label, hint, value, disabled, onChange }: { label: string; hint: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.row}>
    <View style={styles.text}><Text style={styles.label}>{label}</Text><Text style={styles.hint}>{hint}</Text></View>
    <Switch accessibilityLabel={label} value={value} disabled={disabled} onValueChange={onChange} trackColor={{ false: GameColors.track, true: GameColors.green }} thumbColor={GameColors.paper} />
  </View>;
}
const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }, text: { flex: 1, gap: 4 },
  label: { ...GameUi.typography.body, fontWeight: '800', color: GameColors.ink }, hint: { ...GameUi.typography.caption, color: GameColors.inkMuted },
});
