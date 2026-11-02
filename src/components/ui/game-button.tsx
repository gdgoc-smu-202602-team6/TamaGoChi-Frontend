import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { GameColors, GameUi, Spacing } from '@/constants/theme';

type GameButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'success';
  accessibilityLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GameButton({ label, onPress, variant = 'primary', compact, disabled: explicitlyDisabled, style, accessibilityLabel }: GameButtonProps) {
  const disabled = explicitlyDisabled || !onPress;
  return (
    <View style={[styles.depth, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        aria-disabled={disabled}
        style={({ pressed }) => [
          styles.face,
          { backgroundColor: variant === 'primary' ? GameColors.yellow : variant === 'success' ? GameColors.green : GameColors.cream },
          compact && styles.compact,
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.label, compact && styles.compactLabel, disabled && styles.disabledLabel]}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  depth: { borderRadius: GameUi.radius.button, backgroundColor: GameColors.ink, paddingBottom: GameUi.depth },
  face: {
    borderWidth: GameUi.borderWidth,
    borderColor: GameColors.ink,
    borderRadius: GameUi.radius.button,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { ...GameUi.typography.title, color: GameColors.ink, textAlign: 'center' },
  compact: { minHeight: 44, paddingHorizontal: Spacing.two },
  compactLabel: { ...GameUi.typography.body, fontWeight: '800' },
  disabledLabel: { color: GameColors.inkMuted },
  pressed: { transform: [{ translateY: 2 }] },
});
