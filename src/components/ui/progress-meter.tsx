import { StyleSheet, View } from 'react-native';

import { GameColors, GameUi } from '@/constants/theme';

type ProgressMeterProps = { value: number; target: number; label: string; color?: string };

export function ProgressMeter({ value, target, label, color = GameColors.green }: ProgressMeterProps) {
  const progress = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      style={styles.track}>
      <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 7,
    borderWidth: GameUi.borderWidth,
    borderColor: GameColors.track,
    backgroundColor: GameColors.track,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
});
