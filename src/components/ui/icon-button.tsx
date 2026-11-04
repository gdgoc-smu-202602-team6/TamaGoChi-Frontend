import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GameColors } from '@/constants/theme';
import { UiIcon, type UiIconName } from './ui-icon';

/** Plain 44×44 top-bar icon. `badge` (such as an unread count) sits on the icon's upper right. */
export function IconButton({ icon, label, onPress, disabled, badge, tone = 'light' }: { icon: UiIconName; label: string; onPress: () => void; disabled?: boolean; badge?: ReactNode; tone?: 'light' | 'dark' }) {
  const color = tone === 'dark' ? GameColors.cream : GameColors.ink;
  return <Pressable onPress={onPress} disabled={disabled} hitSlop={2} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} style={({ pressed }) => [styles.button, pressed && (tone === 'dark' ? styles.darkPressed : styles.pressed), disabled && styles.disabled]}>
    <UiIcon name={icon} size={25} color={color} />
    {badge && <View pointerEvents="none" style={styles.badge}>{badge}</View>}
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: 'rgba(29, 27, 58, 0.1)' },
  darkPressed: { backgroundColor: 'rgba(255, 244, 214, 0.14)' },
  disabled: { opacity: .4 },
  badge: { position: 'absolute', top: 2, right: 0 },
});
