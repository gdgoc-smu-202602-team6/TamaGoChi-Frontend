import { Pressable, StyleSheet } from 'react-native';
import { GameColors } from '@/constants/theme';
import { UiIcon, type UiIconName } from './ui-icon';

export function IconButton({ icon, label, onPress, disabled, prominent = false }: { icon: UiIconName; label: string; onPress: () => void; disabled?: boolean; prominent?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} style={({ pressed }) => [styles.button, prominent && styles.prominent, (disabled || pressed) && styles.dim]}>
    <UiIcon name={icon} color={prominent ? GameColors.paper : GameColors.ink} />
  </Pressable>;
}
const styles = StyleSheet.create({ button: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, prominent: { backgroundColor: GameColors.accent }, dim: { opacity: .45 } });
