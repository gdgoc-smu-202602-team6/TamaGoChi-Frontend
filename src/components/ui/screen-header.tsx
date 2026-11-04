import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameColors, GameUi } from '@/constants/theme';
import { IconButton } from './icon-button';

/**
 * Fixed top bar: back icon, title and plain action icons, with optional content (tabs) under the row.
 * Render it above the screen's scroll view so the actions stay reachable while content scrolls.
 */
export function ScreenHeader({ title, onBack, backLabel = '뒤로가기', backDisabled, actions, tone = 'light', children }: { title: string; onBack?: () => void; backLabel?: string; backDisabled?: boolean; actions?: ReactNode; tone?: 'light' | 'dark'; children?: ReactNode }) {
  const dark = tone === 'dark';
  return <View style={[styles.bar, dark && styles.darkBar]}>
    <View style={styles.inner}>
      <View style={styles.row}>
        {onBack && <IconButton icon="back" tone={tone} label={backLabel} disabled={backDisabled} onPress={onBack} />}
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, !onBack && styles.rootTitle, dark && styles.darkTitle]}>{title}</Text>
        {actions && <View style={styles.actions}>{actions}</View>}
      </View>
      {children}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  bar: { backgroundColor: GameColors.sky, borderBottomWidth: 1, borderBottomColor: 'rgba(29, 27, 58, 0.14)' },
  darkBar: { backgroundColor: GameColors.night, borderBottomColor: 'rgba(255, 244, 214, 0.12)' },
  inner: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 8 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 2 },
  title: { ...GameUi.typography.title, fontSize: 19, lineHeight: 27, color: GameColors.ink, flex: 1, minWidth: 0, paddingHorizontal: 4 },
  rootTitle: { ...GameUi.typography.brand, fontSize: 22, lineHeight: 30, paddingHorizontal: 10 },
  darkTitle: { color: GameColors.cream },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
