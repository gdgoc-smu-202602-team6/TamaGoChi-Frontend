import { StyleSheet, Text, View } from 'react-native';

import { PixelIcon } from '@/components/ui/pixel-icon';
import { GameColors, GameUi, Spacing } from '@/constants/theme';

export function GameHeader({ balance }: { balance: number | null }) {
  return <View style={styles.row}>
    <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={styles.brand}>다마GoC치</Text>
    <View accessible accessibilityLabel={balance === null ? 'Bolt 확인 중' : `${balance} Bolt`} style={styles.balance}>
      <PixelIcon name="bolt" size={25} />
      <Text style={styles.bolt}>{balance === null ? '—' : balance.toLocaleString()}</Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  brand: { ...GameUi.typography.brand, flex: 1, color: GameColors.yellow, textShadowColor: GameColors.ink, textShadowOffset: { width: 2, height: 3 }, textShadowRadius: 0 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: GameColors.ink, borderRadius: GameUi.radius.badge, paddingHorizontal: 14, paddingVertical: 8 },
  bolt: { ...GameUi.typography.number, fontSize: 23, color: GameColors.paper },
});
