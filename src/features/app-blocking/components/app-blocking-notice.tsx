import { Platform, StyleSheet, Text, View } from 'react-native';
import { GameColors, GameUi } from '@/constants/theme';

// Current builds contain no enforcement adapter. Permissions or a running timer alone
// must never be treated as proof that another app is actually restricted.
export const appBlockingStatus = '앱 차단 미적용';
export const appBlockingMessage = Platform.OS === 'web' ? '브라우저에서는 다른 앱을 차단할 수 없어요.' : '이 버전에서는 다른 앱 사용을 막지 않아요.';

export function AppBlockingNotice() {
  return <View style={styles.content}>
    <Text style={styles.status}>{appBlockingStatus}</Text>
    <Text style={styles.body}>{appBlockingMessage}</Text>
  </View>;
}
const styles = StyleSheet.create({ content: { gap: 8, alignItems: 'center' }, status: { ...GameUi.typography.caption, fontWeight: '800', color: GameColors.ink, backgroundColor: GameColors.skyLight, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 }, body: { ...GameUi.typography.body, color: GameColors.ink, textAlign: 'center' } });
