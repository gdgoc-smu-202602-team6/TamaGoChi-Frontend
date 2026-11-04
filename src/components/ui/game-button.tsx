import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { UiIcon, type UiIconName } from './ui-icon';

type Variant = 'primary' | 'secondary' | 'success' | 'dark';
type GameButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  accessibilityLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  icon?: UiIconName;
  /** Small trailing element such as a count badge. */
  accessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const faces: Record<Variant, { face: string; disabled: string; label: string; disabledLabel: string }> = {
  primary: { face: GameColors.yellow, disabled: GameColors.yellowLight, label: GameColors.ink, disabledLabel: GameColors.inkMuted },
  success: { face: GameColors.green, disabled: GameColors.greenLight, label: GameColors.ink, disabledLabel: GameColors.greenDark },
  secondary: { face: GameColors.paper, disabled: '#F1F0F7', label: GameColors.ink, disabledLabel: GameColors.inkMuted },
  dark: { face: GameColors.ink, disabled: GameColors.nightDeep, label: GameColors.paper, disabledLabel: GameColors.inkSoft },
};

export function GameButton({ label, onPress, variant = 'primary', compact, disabled: explicitlyDisabled, icon, accessory, style, accessibilityLabel }: GameButtonProps) {
  const disabled = explicitlyDisabled || !onPress;
  const tone = faces[variant];
  const labelColor = disabled ? tone.disabledLabel : tone.label;
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.lip, disabled && styles.lipDisabled]} />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        aria-disabled={disabled}
        style={({ pressed }) => [
          styles.face,
          { backgroundColor: disabled ? tone.disabled : tone.face },
          compact && styles.compact,
          pressed && styles.pressed,
        ]}>
        <View style={styles.content}>
          {icon && <UiIcon name={icon} size={compact ? 18 : 20} color={labelColor} />}
          <Text style={[styles.label, compact && styles.compactLabel, { color: labelColor }]}>{label}</Text>
          {accessory}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: GameUi.radius.button },
  // A separate lip lets the face travel down on press without exposing navy above it.
  lip: { position: 'absolute', left: 0, right: 0, bottom: 0, top: GameUi.depth, borderRadius: GameUi.radius.button, backgroundColor: GameColors.ink },
  lipDisabled: { backgroundColor: GameColors.inkSoft },
  face: {
    borderWidth: GameUi.borderWidth,
    borderColor: GameColors.border,
    borderRadius: GameUi.radius.button,
    minHeight: 54,
    marginBottom: GameUi.depth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 1 },
  label: { ...GameUi.typography.body, fontSize: 15, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  compact: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 6 },
  compactLabel: { fontSize: 14 },
  pressed: { transform: [{ translateY: GameUi.depth }] },
});
