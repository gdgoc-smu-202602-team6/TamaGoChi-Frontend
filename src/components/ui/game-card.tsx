import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GameColors, GameUi, Spacing } from '@/constants/theme';

type GameCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Drops the navy base for cards nested inside another card. */
  flat?: boolean;
}>;

export function GameCard({ children, style, contentStyle, flat }: GameCardProps) {
  return (
    <View style={[styles.depth, flat && styles.flat, style]}>
      <View style={[styles.surface, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The navy base peeks out under the surface like the v4 game panels.
  depth: { borderRadius: GameUi.radius.card, backgroundColor: GameColors.ink, paddingBottom: GameUi.depth },
  flat: { backgroundColor: 'transparent', paddingBottom: 0 },
  surface: {
    backgroundColor: GameColors.cream,
    borderColor: GameColors.border,
    borderWidth: GameUi.borderWidth,
    borderRadius: GameUi.radius.card,
    padding: Spacing.three,
    gap: 12,
  },
});
