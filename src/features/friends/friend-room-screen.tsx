import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { RoomScene } from '@/features/room/components/room-scene';
import { useFriendVisit } from './hooks/use-friends';
import { studyDuration } from './study-duration';
import { GuestbookList } from '@/features/guestbook/guestbook-list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { IconButton } from '@/components/ui/icon-button';

export function FriendRoomScreen({ clubId, memberId }: { clubId: string; memberId: string }) {
  const state = useFriendVisit(clubId, memberId), friend = state.data?.friend;
  const target = useMemo(() => ({ kind: 'member' as const, clubId, memberId }), [clubId, memberId]);
  return <SafeAreaView style={styles.screen}><GuestbookList target={target} header={<View style={styles.content}>
    <ScreenHeader title={friend ? `${friend.member.nickname || '닉네임 정보 없음'}의 방` : '친구의 방'} backDisabled={state.operation === 'like'} onBack={() => router.dismissTo('/friends')} backLabel="친구 목록으로 돌아가기" actions={<IconButton icon="refresh" label="방 다시 확인" disabled={!!state.operation} onPress={() => { void state.refresh(); }} />} />
    {state.operation && <ActivityIndicator accessibilityLabel="방 상태 확인 중" color={GameColors.ink} />}{state.error && <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text>}
    {friend && <>
      <View style={styles.heading}><Text style={styles.body}>{state.data!.club.name}</Text><Text style={[styles.part, { backgroundColor: Palette[friend.part.color].background, color: Palette[friend.part.color].text }]}>{friend.part.name}</Text></View>
      <RoomScene appearance={friend.appearance} bugs={friend.condition.bugs} label={`${friend.member.nickname}의 방`} />
      <Text style={styles.caption}>{friend.appearance.size}×{friend.appearance.size}칸 방 · ♥ {friend.condition.hearts}/4 · 버그 {friend.condition.bugs}마리</Text>
      <View style={styles.stats}><GameCard style={styles.stat}><Text style={styles.caption}>레벨</Text><Text style={styles.number}>LV.{friend.level}</Text></GameCard><GameCard style={styles.stat}><Text style={styles.caption}>오늘 공부</Text><Text style={styles.number}>{studyDuration(friend.todaySeconds)}</Text></GameCard></View>
      <GameCard contentStyle={styles.like}><Text accessibilityLiveRegion="polite" style={styles.number}>♥ {friend.likeCount}</Text><GameButton label={friend.likedByMe ? '♥ 좋아요 취소' : '♡ 좋아요'} accessibilityLabel={friend.likedByMe ? '좋아요 취소' : '좋아요'} variant={friend.likedByMe ? 'secondary' : 'primary'} disabled={!!state.operation || !state.verified} onPress={() => { void state.setLike(); }} /></GameCard>
    </>}
    <GameButton variant="secondary" label="동아리 가입·신청" disabled={state.operation === 'like'} onPress={() => router.push('/clubs/join')} />
  </View>} /></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: GameColors.sky }, content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', gap: Spacing.three }, title: { ...GameUi.typography.title, color: GameColors.ink }, heading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, body: { ...GameUi.typography.body, color: GameColors.ink }, caption: { ...GameUi.typography.caption, color: GameColors.inkMuted }, part: { ...GameUi.typography.caption, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 10, padding: 6 }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, stat: { flex: 1, minWidth: 120 }, number: { ...GameUi.typography.title, color: GameColors.ink }, like: { backgroundColor: GameColors.cream }, error: GameUi.errorText });
