import { Platform, StyleSheet, Text, View } from 'react-native';
import { GameColors, GameUi } from '@/constants/theme';

// Current builds contain no enforcement adapter. Permissions or a running timer alone
// must never be treated as proof that another app is actually restricted.
export function AppBlockingNotice({ compact = false }: { compact?: boolean }) {
  return <View style={styles.content}>
    <Text style={styles.status}>앱 차단 미적용</Text>
    {!compact && <Text style={styles.body}>{Platform.OS === 'web' ? '이 브라우저에서는 다른 앱을 차단할 수 없어요.' : '현재 앱 버전에서는 다른 앱 사용을 제한하지 않아요.'}</Text>}
    <Text style={compact ? styles.caption : styles.body}>{compact ? '다른 앱 사용은 제한되지 않아요.' : '앱 선택과 사용 제한 기능은 아직 제공되지 않아요. 공부 타이머와 보상은 계속 이용할 수 있어요.'}</Text>
  </View>;
}
const styles = StyleSheet.create({ content: { gap: 8, alignItems: 'center' }, status: { ...GameUi.typography.caption, fontWeight: '800', color: GameColors.ink, backgroundColor: GameColors.skyLight, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 }, body: { ...GameUi.typography.body, color: GameColors.ink, textAlign: 'center' }, caption: { ...GameUi.typography.caption, color: GameColors.inkMuted, textAlign: 'center' } });
