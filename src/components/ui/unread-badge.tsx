import { StyleSheet, Text, View } from 'react-native';
import { GameColors } from '@/constants/theme';
import { unreadBadge } from '@/utils/notice-unread';

export function UnreadBadge({ count }: { count: number | null | undefined }) {
  const label = unreadBadge(count); if (!label) return null;
  return <View pointerEvents="none" aria-hidden style={styles.badge}><Text style={styles.text}>{label}</Text></View>;
}
const styles = StyleSheet.create({ badge: { backgroundColor: GameColors.alert, borderWidth: 1.5, borderColor: GameColors.ink, borderRadius: 12, minWidth: 22, minHeight: 22, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' }, text: { color: GameColors.paper, fontSize: 12, lineHeight: 17, fontWeight: '800' } });
