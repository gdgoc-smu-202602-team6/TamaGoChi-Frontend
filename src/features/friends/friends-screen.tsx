import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { RoomScene } from '@/features/room/components/room-scene';
import { FilterChips } from '@/features/notices/components/filter-chips';
import { useClubs } from '@/state/club-context';
import { useFriends } from './hooks/use-friends';
import { studyDuration } from './study-duration';
import { ScreenHeader } from '@/components/ui/screen-header';
import { IconButton } from '@/components/ui/icon-button';

export function FriendsScreen() {
  const clubs = useClubs(), selected = clubs.clubs.find(one => one.id === clubs.selectedId);
  if (clubs.status === 'ready' && !clubs.switching && selected) return <ClubFriends key={selected.id} clubId={selected.id} />;
  return <SafeAreaView style={styles.screen}><View style={styles.content}>
    <ScreenHeader title="친구" onBack={() => router.dismissTo('/')} backLabel="내 방으로 돌아가기" />
    {clubs.status === 'loading' || clubs.switching ? <ActivityIndicator accessibilityLabel="동아리 확인 중" color={GameColors.ink} /> : <GameCard><Text style={styles.body}>{clubs.error ?? '가입한 동아리가 없어요. 가입 승인 후 부원들의 방을 구경할 수 있어요.'}</Text><GameButton label="동아리 목록 다시 확인" onPress={() => { void clubs.refresh(); }} /><GameButton label="동아리 가입·신청" onPress={() => router.push('/clubs/join')} /></GameCard>}
  </View></SafeAreaView>;
}
function ClubFriends({ clubId }: { clubId: string }) {
  const clubs = useClubs(), state = useFriends(clubId);
  return <SafeAreaView style={styles.screen}><FlatList style={styles.list} contentContainerStyle={styles.content} data={state.data?.friends ?? []} numColumns={2} columnWrapperStyle={styles.row} keyExtractor={one => one.member.id}
    refreshing={state.operation === 'read'} onRefresh={() => { void state.refresh(); }}
    ListHeaderComponent={<View style={styles.header}><ScreenHeader title="친구" onBack={() => router.dismissTo('/')} backLabel="내 방으로 돌아가기" actions={<IconButton icon="refresh" label="친구 방 다시 확인" disabled={!!state.operation} onPress={() => { void state.refresh(); void clubs.refresh(); }} />} />
      <FilterChips label="동아리" value={clubId} options={clubs.clubs} onChange={id => { void clubs.selectClub(id); }} />
      <Text style={styles.caption}>{state.data ? `${state.data.club.name} · ${state.data.friends.length}명 · 오늘 공부시간 순` : '친구들의 방을 확인하고 있어요.'}</Text>
      {state.operation && <ActivityIndicator accessibilityLabel="친구 방 불러오는 중" color={GameColors.ink} />}{state.error && <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text>}
    </View>}
    renderItem={({ item }) => <Pressable style={styles.cell} accessibilityRole="button" accessibilityLabel={`${item.member.nickname || '닉네임 정보 없음'}의 방 방문`} accessibilityHint={`레벨 ${item.level}, 오늘 ${studyDuration(item.todaySeconds)}, 버그 ${item.condition.bugs}마리, 좋아요 ${item.likeCount}개`} accessibilityState={{ disabled: !state.verified || !!state.operation }} disabled={!state.verified || !!state.operation} onPress={() => router.push({ pathname: '/clubs/[clubId]/friends/[memberId]', params: { clubId, memberId: item.member.id } })}>
      <GameCard contentStyle={styles.card}><View style={styles.thumbnail}><RoomScene appearance={item.appearance} bugs={item.condition.bugs} label={`${item.member.nickname}의 방`} /><View style={styles.likeBadge}><Text style={styles.badgeText}>♥ {item.likeCount}</Text></View>{item.condition.bugs > 0 && <View style={styles.bugBadge}><Text style={styles.badgeText}>버그 {item.condition.bugs}</Text></View>}</View>
        <Text style={styles.name}>{item.member.nickname || '닉네임 정보 없음'}</Text><Text style={[styles.part, { backgroundColor: Palette[item.part.color].background, color: Palette[item.part.color].text }]}>{item.part.name}</Text><Text style={styles.caption}>LV.{item.level} · 오늘 {studyDuration(item.todaySeconds)}</Text>
      </GameCard>
    </Pressable>}
    ListEmptyComponent={!state.operation && !state.error && state.data ? <GameCard><Text style={styles.body}>아직 다른 부원이 없어요. 부원이 가입하면 방이 표시돼요.</Text></GameCard> : undefined}
  /></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: GameColors.sky }, list: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center' }, content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', padding: 18, paddingBottom: Spacing.four, gap: 12 }, header: { gap: 12, marginBottom: 4 }, row: { gap: 12 }, cell: { flex: 1, maxWidth: '50%' }, card: { padding: 8, gap: 7, backgroundColor: GameColors.paper }, thumbnail: { backgroundColor: GameColors.skyLight, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12, overflow: 'hidden' }, likeBadge: { position: 'absolute', right: 3, top: 3, backgroundColor: GameColors.cream, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 10, paddingHorizontal: 4 }, bugBadge: { position: 'absolute', left: 3, bottom: 3, backgroundColor: GameColors.yellow, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 10, paddingHorizontal: 4 }, badgeText: { ...GameUi.typography.caption, color: GameColors.ink, fontWeight: '800' }, title: { ...GameUi.typography.number, fontSize: 40, lineHeight: 48, color: GameColors.yellow, textShadowColor: GameColors.ink, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 }, name: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '800' }, body: { ...GameUi.typography.body, color: GameColors.ink }, caption: { ...GameUi.typography.caption, color: GameColors.inkMuted }, part: { ...GameUi.typography.caption, alignSelf: 'flex-start', borderWidth: 2, borderColor: GameColors.ink, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }, error: { ...GameUi.typography.body, color: GameColors.coral } });
