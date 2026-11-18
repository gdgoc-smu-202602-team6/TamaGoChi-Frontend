import { StyleSheet, Text, View } from 'react-native';

import { PixelIcon } from '@/components/ui/pixel-icon';
import { GameColors, GameUi } from '@/constants/theme';

/** The small Bolt balance chip for a screen's top bar (home and shop). */
export function BoltBalance({ value }: { value: number }) {
  const text = value.toLocaleString();
  return <View accessible accessibilityLabel={`보유 ${text} Bolt`} style={styles.chip}>
    <PixelIcon name="bolt" size={18} /><Text style={styles.text}>{text}</Text>
  </View>;
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GameColors.paper, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: GameUi.radius.badge, paddingVertical: 4, paddingHorizontal: 10 },
  text: { ...GameUi.typography.caption, fontWeight: '800', color: GameColors.ink },
});
