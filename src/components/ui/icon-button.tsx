import { Pressable, StyleSheet, View } from 'react-native';
import { GameColors, GameUi } from '@/constants/theme';
import { UiIcon, type UiIconName } from './ui-icon';

const depth = 2;

/** 44×44 square game button used in headers (back, refresh, write, settings). */
export function IconButton({ icon, label, onPress, disabled, prominent = false }: { icon: UiIconName; label: string; onPress: () => void; disabled?: boolean; prominent?: boolean }) {
  return <View style={styles.wrap}>
    <View style={[styles.lip, disabled && styles.lipDisabled]} />
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} style={({ pressed }) => [styles.button, prominent && styles.prominent, disabled && styles.disabled, pressed && styles.pressed]}>
      <UiIcon name={icon} size={21} color={disabled ? GameColors.inkMuted : GameColors.ink} />
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  wrap: { width: 44, height: 44 + depth },
  lip: { position: 'absolute', left: 0, right: 0, bottom: 0, top: depth, borderRadius: 14, backgroundColor: GameColors.ink },
  lipDisabled: { backgroundColor: GameColors.inkSoft },
  button: { width: 44, height: 44, borderRadius: 14, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, backgroundColor: GameColors.paper, alignItems: 'center', justifyContent: 'center' },
  prominent: { backgroundColor: GameColors.yellow },
  disabled: { backgroundColor: '#F1F0F7', borderColor: GameColors.inkSoft },
  pressed: { transform: [{ translateY: depth }] },
});
