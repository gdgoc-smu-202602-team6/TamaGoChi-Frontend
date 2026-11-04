import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameColors, GameUi } from '@/constants/theme';
import { IconButton } from './icon-button';

export function ScreenHeader({ title, onBack, backLabel = '뒤로가기', backDisabled, actions, tone = 'light' }: { title: string; onBack?: () => void; backLabel?: string; backDisabled?: boolean; actions?: ReactNode; tone?: 'light' | 'dark' }) {
  return <View style={styles.header}>
    <View style={styles.leading}>{onBack && <IconButton icon="back" label={backLabel} disabled={backDisabled} onPress={onBack} />}<Text accessibilityRole="header" numberOfLines={2} style={[styles.title, tone === 'dark' && styles.darkTitle]}>{title}</Text></View>
    {actions && <View style={styles.actions}>{actions}</View>}
  </View>;
}
const styles = StyleSheet.create({
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  leading: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  title: { ...GameUi.typography.brand, fontSize: 22, lineHeight: 30, color: GameColors.ink, flexShrink: 1 },
  darkTitle: { color: GameColors.cream },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
