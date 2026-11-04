import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GameButton } from '@/components/ui/game-button';
import { UnreadBadge } from '@/components/ui/unread-badge';
import { GameColors, GameUi } from '@/constants/theme';
import { useNoticeUnread } from '@/state/notice-unread-context';
import type { JoinedClub } from '@/types/notice';
import { unreadDescription } from '@/utils/notice-unread';

export function ClubNoticeSelector({ clubs, selectedId, onChange }: { clubs: readonly JoinedClub[]; selectedId: string; onChange: (id: string) => void }) {
  const unread = useNoticeUnread(), failed = clubs.some(club => unread.getEntry(club.id)?.status === 'error');
  return <View style={styles.content}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel="동아리">
    {clubs.map(club => { const entry = unread.getEntry(club.id), count = entry?.status === 'ready' ? entry.count : null; return <Pressable key={club.id} accessibilityRole="button" accessibilityLabel={`동아리 ${club.name}`} accessibilityHint={unreadDescription(club.name, count)} aria-describedby={`club-unread-${club.id}`} accessibilityState={{ selected: selectedId === club.id }} onPress={() => onChange(club.id)} style={[styles.chip, selectedId === club.id && styles.selected]}>
      <Text style={styles.text}>{club.name}</Text><UnreadBadge count={count} /><Text nativeID={`club-unread-${club.id}`} style={styles.description}>{unreadDescription(club.name, count)}</Text>
    </Pressable>; })}
  </ScrollView>{failed && <><Text accessibilityRole="alert" style={styles.caption}>일부 동아리의 읽지 않은 수를 확인하지 못했어요.</Text><GameButton compact variant="secondary" label="읽지 않은 수 다시 확인" onPress={() => { void unread.refreshAll(); }} /></>}</View>;
}
const styles = StyleSheet.create({ content: { gap: 6 }, row: { gap: 6, paddingVertical: 4 }, chip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, backgroundColor: GameColors.paper, borderRadius: GameUi.radius.badge }, selected: { backgroundColor: GameColors.yellow }, text: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '800' }, caption: { ...GameUi.typography.caption, color: GameColors.ink }, description: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 } });
