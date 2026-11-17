import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { GameColors, GameUi } from '@/constants/theme';
import { UiIcon, type UiIconName } from './ui-icon';

const SIZE = 76;

/** Big round icon button with the navy lip (start/stop study). The label is spoken, not shown. */
export function RoundActionButton({ icon, label, onPress, disabled, busy, color = GameColors.green, iconColor = GameColors.ink, iconFill = GameColors.paper, iconOffset = 0 }: {
  icon: UiIconName; label: string; onPress?: () => void; disabled?: boolean; busy?: boolean;
  color?: string; iconColor?: string; iconFill?: string; /** Optical centring, such as nudging the play triangle right. */ iconOffset?: number;
}) {
  const off = disabled || busy || !onPress;
  return <View style={styles.wrap}>
    <View style={styles.lip} />
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: off, busy }} disabled={off} onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: color, paddingLeft: iconOffset }, pressed && styles.pressed, off && styles.dim]}>
      {busy ? <ActivityIndicator color={iconColor} /> : <UiIcon name={icon} size={34} color={iconColor} fill={iconFill} />}
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE + GameUi.depth, alignSelf: 'center' },
  lip: { position: 'absolute', left: 0, right: 0, bottom: 0, top: GameUi.depth, borderRadius: SIZE / 2, backgroundColor: GameColors.ink },
  button: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, justifyContent: 'center', alignItems: 'center' },
  pressed: { transform: [{ translateY: GameUi.depth }] },
  dim: { opacity: .6 },
});
