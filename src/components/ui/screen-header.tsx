import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameColors, GameUi } from '@/constants/theme';
import { IconButton } from './icon-button';

export function ScreenHeader({ title, onBack, backLabel = '뒤로가기', backDisabled, actions }: { title: string; onBack?: () => void; backLabel?: string; backDisabled?: boolean; actions?: ReactNode }) {
  return <View style={styles.header}>
    <View style={styles.leading}>{onBack && <IconButton icon="back" label={backLabel} disabled={backDisabled} onPress={onBack} />}<Text accessibilityRole="header" style={styles.title}>{title}</Text></View>
    {actions && <View style={styles.actions}>{actions}</View>}
  </View>;
}
const styles = StyleSheet.create({ header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, leading: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }, title: { ...GameUi.typography.brand, fontSize: 22, lineHeight: 30, color: GameColors.ink, flexShrink: 1 }, actions: { flexDirection: 'row', alignItems: 'center', gap: 2 } });
