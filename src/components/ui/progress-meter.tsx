import { StyleSheet, View } from 'react-native';

import { GameColors, GameUi } from '@/constants/theme';

type ProgressMeterProps = { value: number; target: number; label: string; color?: string; segments?: number };

/** Segmented pixel gauge from the v4 mockup. The last segment fills partially so progress stays exact. */
export function ProgressMeter({ value, target, label, color = GameColors.green, segments = 12 }: ProgressMeterProps) {
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
      {Array.from({ length: segments }, (_, index) => {
        const fill = Math.max(0, Math.min(1, progress * segments - index));
        return <View key={index} style={styles.cell}>{fill > 0 && <View style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: color }]} />}</View>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 18,
    flexDirection: 'row',
    gap: 2,
    padding: 2,
    borderRadius: 9,
    borderWidth: GameUi.borderWidth,
    borderColor: GameColors.ink,
    backgroundColor: GameColors.paper,
    overflow: 'hidden',
  },
  cell: { flex: 1, borderRadius: 3, backgroundColor: GameColors.track, overflow: 'hidden' },
  fill: { height: '100%' },
});
