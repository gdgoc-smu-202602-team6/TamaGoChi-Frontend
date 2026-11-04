import { StyleSheet, Text, View } from 'react-native';
import { GameButton } from '@/components/ui/game-button';
import { UnderlineTabs } from '@/components/ui/underline-tabs';
import { UnreadBadge } from '@/components/ui/unread-badge';
import { GameColors, GameUi } from '@/constants/theme';
import { useNoticeUnread } from '@/state/notice-unread-context';
import type { JoinedClub } from '@/types/notice';
import { unreadDescription } from '@/utils/notice-unread';

/** Club tabs for the notice top bar. Each tab carries that club's unread count. */
export function ClubNoticeSelector({ clubs, selectedId, onChange }: { clubs: readonly JoinedClub[]; selectedId: string; onChange: (id: string) => void }) {
  const unread = useNoticeUnread();
  return <UnderlineTabs label="동아리" value={selectedId} onChange={onChange} tabs={clubs.map(club => {
    const entry = unread.getEntry(club.id), count = entry?.status === 'ready' ? entry.count : null, description = unreadDescription(club.name, count);
    return { id: club.id, name: club.name, badge: <UnreadBadge count={count} />, hint: description, describedBy: `club-unread-${club.id}`, description };
  })} />;
}

/** Shown in the list when some clubs' unread counts could not be read. */
export function ClubUnreadRetry({ clubs }: { clubs: readonly JoinedClub[] }) {
  const unread = useNoticeUnread();
  if (!clubs.some(club => unread.getEntry(club.id)?.status === 'error')) return null;
  return <View style={styles.content}>
    <Text accessibilityRole="alert" style={styles.caption}>일부 동아리의 읽지 않은 수를 확인하지 못했어요.</Text>
    <GameButton compact variant="secondary" label="읽지 않은 수 다시 확인" onPress={() => { void unread.refreshAll(); }} />
  </View>;
}
const styles = StyleSheet.create({ content: { gap: 6 }, caption: { ...GameUi.typography.caption, color: GameColors.ink } });
