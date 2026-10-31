import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GameColors, GameUi, Spacing } from '@/constants/theme';

type GameCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function GameCard({ children, style, contentStyle }: GameCardProps) {
  return (
    <View style={[styles.depth, style]}>
      <View style={[styles.surface, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  depth: { backgroundColor: GameColors.ink, borderRadius: GameUi.radius.card, paddingBottom: GameUi.depth },
  surface: {
    backgroundColor: GameColors.cream,
    borderColor: GameColors.ink,
    borderWidth: GameUi.borderWidth,
    borderRadius: GameUi.radius.card,
    padding: Spacing.three,
    gap: 12,
  },
});
