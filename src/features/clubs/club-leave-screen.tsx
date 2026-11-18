import { router, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameButton } from '@/components/ui/game-button';
import { IconButton } from '@/components/ui/icon-button';
import { GameCard } from '@/components/ui/game-card';
import { GameConfirmDialog } from '@/components/ui/game-confirm-dialog';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { OwnClubMembership } from '@/types/club-membership';
import { noticeDate } from '@/utils/notice';
import { useClubMembership } from './hooks/use-club-membership';

export function ClubLeaveScreen({ clubId }: { clubId: string }) {
  const manager = useClubMembership(clubId);
  usePreventRemove(manager.operation === 'leave', () => {});
  return <LeaveContent key={manager.state?.kind ?? 'loading'} manager={manager} />;
}
function LeaveContent({ manager }: { manager: ReturnType<typeof useClubMembership> }) {
  const [target, setTarget] = useState<OwnClubMembership | null>(null), data = manager.state?.kind === 'member' ? manager.state.data : null;
  return <SafeAreaView style={styles.screen}><ScrollView style={styles.list} contentContainerStyle={styles.content}>
    <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>동아리 탈퇴</Text>
      <IconButton icon="refresh" label="부원 자격 새로고침" disabled={!!manager.operation || !!target} onPress={() => { void manager.refresh(); }} /></View>
    {manager.operation && <ActivityIndicator accessibilityLabel="부원 자격 확인 중" color={GameColors.ink} />}
    {manager.error && <Text accessibilityRole="alert" style={styles.error}>{manager.error}</Text>}
    {manager.notice && <Text accessibilityLiveRegion="polite" style={styles.body}>{manager.notice}</Text>}
    {manager.clubError && <Text accessibilityRole="alert" style={styles.error}>{manager.clubError}</Text>}
    {data && <GameCard><Text accessibilityRole="header" style={styles.title}>{data.club.name}</Text><Text style={styles.body}>{data.member.nickname || '닉네임 정보 없음'} · {noticeDate(data.member.joinedAt)} 가입</Text>
      <Text style={styles.body}>탈퇴하면 이 동아리의 공지와 부원 기능을 이용할 수 없어요. 개인 공부 기록·볼트·경험치·방은 유지돼요.</Text>
      <GameButton label="이 동아리 탈퇴" disabled={!!manager.operation || !manager.verified || !!target} onPress={() => setTarget(data)} />
    </GameCard>}
    <GameButton variant="secondary" label="가입 목록으로" disabled={!!manager.operation || !!target} onPress={() => router.dismissTo('/clubs/join')} />
    <GameButton variant="secondary" label="내 방으로" disabled={!!manager.operation || !!target} onPress={() => router.dismissTo('/')} />
  </ScrollView><GameConfirmDialog visible={!!target && !!data} title="동아리에서 탈퇴할까요?" message={`${target?.club.name ?? ''}\n\n동아리 부원 자격과 공지 읽음이 삭제돼요. 개인 공부·볼트·방은 유지되며 다시 가입하려면 가입 신청과 승인이 필요해요.`} confirmLabel="탈퇴 확인" confirmDisabled={!!manager.operation || !manager.verified} onConfirm={() => { const member = target?.member; setTarget(null); if (member) void manager.leave(member); }} onCancel={() => setTarget(null)} /></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: GameColors.sky }, list: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center' }, content: { flexGrow: 1, padding: 18, paddingBottom: Spacing.four, gap: Spacing.three }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, title: { ...GameUi.typography.title, color: GameColors.ink }, body: { ...GameUi.typography.body, color: GameColors.ink }, error: GameUi.errorText });
