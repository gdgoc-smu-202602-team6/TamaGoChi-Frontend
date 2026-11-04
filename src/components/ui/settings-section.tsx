import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GameColors, GameUi } from '@/constants/theme';
import { UiIcon, type UiIconName } from './ui-icon';

export function SettingsSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return <View style={styles.section}><Text accessibilityRole="header" style={styles.heading}>{title}</Text><View style={styles.group}>{children}</View></View>;
}
export function SettingsRow({ title, icon, value, onPress, disabled, accessibilityLabel }: { title: string; icon?: UiIconName; value?: string; onPress: () => void; disabled?: boolean; accessibilityLabel?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? `${title}${value ? `, ${value}` : ''}`} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.row, (pressed || disabled) && styles.dim]}>
    {icon && <View style={styles.icon}><UiIcon name={icon} size={19} color={GameColors.accent} /></View>}
    <Text style={styles.title}>{title}</Text>{value && <Text numberOfLines={1} style={styles.value}>{value}</Text>}<UiIcon name="chevron" size={16} color={GameColors.inkMuted} />
  </Pressable>;
}
const styles = StyleSheet.create({ section: { gap: 8 }, heading: { ...GameUi.typography.caption, color: GameColors.inkMuted, paddingHorizontal: 12 }, group: { backgroundColor: GameColors.paper, borderRadius: 20, borderWidth: 1, borderColor: GameColors.border, overflow: 'hidden' }, row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: GameColors.border }, icon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: GameColors.skyLight }, title: { ...GameUi.typography.body, fontSize: 15, color: GameColors.ink, flex: 1 }, value: { ...GameUi.typography.caption, color: GameColors.inkMuted, maxWidth: '38%' }, dim: { opacity: .5 } });
