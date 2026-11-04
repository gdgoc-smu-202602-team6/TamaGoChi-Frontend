import { router } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameButton } from '@/components/ui/game-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GameCard } from '@/components/ui/game-card';
import { isMockMode } from '@/constants/api';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { ReviewApplicationCard } from './components/review-application-card';
import { useApplicationReview } from './hooks/use-application-review';

export function ApplicationReviewScreen({ clubId }: { clubId: string }) {
  const review = useApplicationReview(clubId), disabled = review.refreshing || !!review.processing || review.unverified;
  const board = review.board;
  return <SafeAreaView style={styles.screen}>
    <FlatList style={styles.list} contentContainerStyle={styles.content} data={board ? board.applications : []} keyExtractor={item => item.id}
      refreshing={review.refreshing} onRefresh={() => { void review.refresh(); }} ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={<View style={styles.header}>
        <ScreenHeader title="가입 신청 관리" onBack={() => router.dismissTo('/clubs/join')} backLabel="가입·신청으로 돌아가기" backDisabled={!!review.processing} />
        {board && <GameCard contentStyle={styles.summary}>
          <Text accessibilityRole="header" style={styles.title}>{board.club.name}</Text>
          <Text style={styles.body}>부원 {board.club.memberCount}명 · 파트 {board.parts.length}개</Text>
          <Text style={styles.count}>승인 대기 {board.applications.length}명</Text>
          <Text style={styles.caption}>승인하면 신청한 파트의 부원으로 가입합니다. 처리된 신청은 대기 목록에서 사라져요.</Text>
        </GameCard>}
        {isMockMode && <Text style={styles.caption}>미리보기 모드 · 첫 동아리와 직접 만든 동아리에 관리 권한이 있어요.</Text>}
        {review.error && <Text accessibilityRole="alert" style={styles.error}>{review.error}</Text>}
        {review.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{review.notice}</Text>}
        <GameButton compact variant="secondary" label="신청 상태 다시 확인" disabled={review.refreshing || !!review.processing} onPress={() => { void review.refresh(); }} />
        {review.refreshing && <ActivityIndicator accessibilityLabel="가입 신청 확인 중" color={GameColors.ink} />}
      </View>}
      renderItem={({ item }) => board ? <ReviewApplicationCard application={item} parts={board.parts} disabled={disabled} processing={review.processing === item.id} onDecide={decision => { void review.decide(item, decision); }} /> : null}
      ListEmptyComponent={!review.refreshing && board && !review.unverified ? <GameCard><Text style={styles.body}>대기 중인 가입 신청이 없어요.</Text></GameCard> : undefined}
    />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky }, list: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center' }, content: { flexGrow: 1, padding: 18, paddingBottom: Spacing.four },
  header: { gap: Spacing.three, marginBottom: Spacing.three }, heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  title: { ...GameUi.typography.title, color: GameColors.ink }, body: { ...GameUi.typography.body, color: GameColors.ink }, caption: { ...GameUi.typography.caption, color: GameColors.inkMuted },
  summary: { backgroundColor: GameColors.cream }, count: { ...GameUi.typography.title, color: GameColors.coral }, error: GameUi.errorText,
  notice: { ...GameUi.typography.body, color: GameColors.ink, backgroundColor: GameColors.cream, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12, padding: 12 }, separator: { height: Spacing.three },
});
