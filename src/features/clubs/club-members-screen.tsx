import { useState } from 'react';
import { usePreventRemove } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameButton } from '@/components/ui/game-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GameCard } from '@/components/ui/game-card';
import { GameConfirmDialog } from '@/components/ui/game-confirm-dialog';
import { ClubLeaveEntry } from './components/club-leave-entry';
import { Palette } from '@/constants/palette';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { ClubMember } from '@/types/club-members';
import { noticeDate } from '@/utils/notice';
import { MemberRoleDialog } from './components/member-role-dialog';
import { useClubMembers } from './hooks/use-club-members';

export function ClubMembersScreen({ clubId }: { clubId: string }) {
  const manager = useClubMembers(clubId);
  usePreventRemove(manager.operation === 'remove', () => {});
  return <MembersContent key={manager.board ? 'loaded' : 'unavailable'} manager={manager} />;
}
function MembersContent({ manager }: { manager: ReturnType<typeof useClubMembers> }) {
  const [target, setTarget] = useState<ClubMember | null>(null), [removeTarget, setRemoveTarget] = useState<ClubMember | null>(null), board = manager.board, disabled = !!manager.operation || !manager.verified || !!target || !!removeTarget;
  return <SafeAreaView style={styles.screen}><ScreenHeader title="부원·역할 관리" onBack={() => { void manager.openList(); }} backLabel="공지로 돌아가기" backDisabled={!!manager.operation || !!target || !!removeTarget} />
    <FlatList style={styles.list} contentContainerStyle={styles.content} data={board ? board.members : []} keyExtractor={item => item.id}
      ListHeaderComponent={<View style={styles.header}>
        {board && <Text style={styles.body}>{board.club.name} · 조회한 부원 {board.members.length}명</Text>}
        {manager.operation && <ActivityIndicator accessibilityLabel="부원 확인 중" color={GameColors.ink} />}
        {manager.error && <Text accessibilityRole="alert" style={styles.error}>{manager.error}</Text>}
        {manager.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{manager.notice}</Text>}
        <GameButton compact variant="secondary" label="부원 목록 다시 확인" disabled={!!manager.operation || !!target || !!removeTarget} onPress={() => { void manager.refresh(); }} />
        {board && <Text style={styles.caption}>역할에 포함된 권한을 확인한 뒤 변경해 주세요. 부원 관리 권한을 가진 사용자는 최소 한 명이 필요해요.</Text>}
      </View>}
      renderItem={({ item }) => {
        if (!board) return null;
        const part = board.parts.find(one => one.id === item.partId), role = board.roles.find(one => one.id === item.roleId), palette = Palette[part?.color ?? 'GRAY'];
        return <GameCard style={styles.item}><View style={styles.heading}><View style={styles.identity}><Text accessibilityRole="header" style={styles.title}>{item.nickname || '닉네임 정보 없음'}{item.id === board.me.id ? ' · 나' : ''}</Text><Text style={styles.caption}>{noticeDate(item.joinedAt)} 가입</Text></View><Text style={styles.role}>{role?.name ?? '역할 정보 없음'}</Text></View>
          <Text style={[styles.part, { backgroundColor: palette.background, color: palette.text }]}>{part?.name ?? '파트 정보 없음'}</Text>
          <GameButton compact label="역할 변경" accessibilityLabel={`${item.nickname || '닉네임 정보 없음'} 역할 변경`} disabled={disabled} onPress={() => setTarget(item)} />
          {item.id !== board.me.id && <GameButton compact variant="secondary" label="강퇴" accessibilityLabel={`${item.nickname || '닉네임 정보 없음'} 강퇴`} disabled={disabled} onPress={() => setRemoveTarget(item)} />}
        </GameCard>;
      }}
      ListFooterComponent={<View style={styles.header}>{board && <ClubLeaveEntry clubId={board.club.id} clubName={board.club.name} disabled={!!manager.operation || !!target || !!removeTarget} />}<GameButton variant="secondary" label="공지 목록으로" disabled={!!manager.operation || !!target || !!removeTarget} onPress={() => { void manager.openList(); }} /></View>}
    />
    {target && board && <MemberRoleDialog key={target.id} member={target} roles={board.roles} isMe={target.id === board.me.id} disabled={!!manager.operation || !manager.verified} onConfirm={action => { setTarget(null); void manager.changeRole(action); }} onCancel={() => setTarget(null)} />}
    <GameConfirmDialog visible={!!removeTarget && !!board} title="부원을 강퇴할까요?" message={`${removeTarget?.nickname || '닉네임 정보 없음'}\n\n이 동아리의 부원 자격과 공지 읽음이 삭제돼요. 상대의 개인 공부·볼트·방은 유지돼요.`} confirmLabel="강퇴 확인" confirmDisabled={!!manager.operation || !manager.verified} onConfirm={() => { const member = removeTarget; setRemoveTarget(null); if (member) void manager.removeMember(member); }} onCancel={() => setRemoveTarget(null)} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky }, list: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center' }, content: { flexGrow: 1, padding: 18, paddingBottom: Spacing.four }, header: { gap: Spacing.three, marginBottom: Spacing.three },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }, identity: { flex: 1, minWidth: 120, gap: 4 }, title: { ...GameUi.typography.title, color: GameColors.ink }, body: { ...GameUi.typography.body, color: GameColors.ink }, caption: { ...GameUi.typography.caption, color: GameColors.inkMuted },
  error: GameUi.errorText, notice: { ...GameUi.typography.body, color: GameColors.ink, padding: 12, backgroundColor: GameColors.cream, borderRadius: 12 }, item: { marginBottom: Spacing.three },
  role: { ...GameUi.typography.caption, color: GameColors.ink, backgroundColor: GameColors.yellow, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12, padding: 8 }, part: { ...GameUi.typography.body, alignSelf: 'flex-start', borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
});
