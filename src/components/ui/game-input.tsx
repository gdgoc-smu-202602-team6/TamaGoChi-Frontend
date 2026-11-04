import { useId } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { GameColors, GameUi, Spacing } from '@/constants/theme';

export function GameInput({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const id = useId();
  return (
    <View style={styles.field}>
      <Text nativeID={`${id}-label`} style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        aria-labelledby={`${id}-label`}
        placeholderTextColor={GameColors.inkMuted}
        selectionColor={GameColors.orange}
        style={[styles.input, props.editable === false && styles.disabled, props.style]}
      />
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  label: { ...GameUi.typography.body, fontWeight: '800', color: GameColors.ink },
  input: { ...GameUi.typography.body, fontSize: 15, minHeight: 52, paddingHorizontal: Spacing.three, paddingVertical: 12, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: GameUi.radius.button, color: GameColors.ink, backgroundColor: GameColors.paper },
  hint: { ...GameUi.typography.caption, color: GameColors.inkMuted },
  disabled: { opacity: 0.6 },
});
