import { router } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameHeader } from '@/components/ui/game-header';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { useAuth } from '@/state/auth-context';
import { formatStudySummary } from '@/utils/profile';
import { DailyGoalEditor } from './components/daily-goal-editor';
import { ProfileCard } from './components/profile-card';
import { WeeklyChart } from './components/weekly-chart';
import { useProfile } from './hooks/use-profile';

export function ProfileScreen() {
  const profile = useProfile(), { state: auth } = useAuth();
  const data = profile.data;
  const summaries = data ? [
    { title: '오늘', value: formatStudySummary(data.todaySeconds), color: GameColors.yellow },
    { title: '이번 주', value: formatStudySummary(data.weekSeconds), color: GameColors.heart },
    { title: '연속 출석', value: `${data.attendanceStreak}일`, color: GameColors.green },
  ] : [];
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={profile.refreshing} onRefresh={() => { void profile.refresh(); }} tintColor={GameColors.ink} />}>
      <View style={styles.content}>
        <GameHeader balance={data?.balance ?? null} />
        <Text accessibilityRole="header" style={styles.title}>MY PAGE</Text>
        {profile.refreshing && <ActivityIndicator color={GameColors.ink} accessibilityLabel="마이 불러오는 중" />}
        {profile.error && <GameCard><Text accessibilityRole="alert" style={styles.body}>{profile.error}</Text><GameButton compact label="다시 불러오기" disabled={profile.refreshing || profile.saving} onPress={() => { void profile.refresh(); }} /></GameCard>}
        {profile.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{profile.notice}</Text>}
        {data && <>
          <ProfileCard profile={data} />
          <View style={styles.summaries}>{summaries.map(summary => <GameCard key={summary.title} style={styles.summary} contentStyle={[styles.summaryFace, { backgroundColor: summary.color }]}><Text style={styles.summaryTitle}>{summary.title}</Text><Text style={styles.summaryValue}>{summary.value}</Text></GameCard>)}</View>
          <WeeklyChart profile={data} />
          <DailyGoalEditor key={`${data.serviceDay}:${data.scheduledGoals.find(goal => goal.startOn === data.tomorrow)?.minutes ?? '-'}`} profile={data} disabled={profile.refreshing || profile.unverified} saving={profile.saving} onSave={minutes => { void profile.saveGoal(minutes); }} />
        </>}
        <GameCard>
          <GameButton compact variant="secondary" label="동아리 가입·신청" onPress={() => router.push('/clubs/join')} />
          <GameButton compact variant="secondary" label={auth.user ? '내 계정' : '이메일로 로그인'} onPress={() => router.push(auth.user ? '/account' : '/login')} />
          <GameButton compact variant="secondary" label="잠금한 앱 관리 · 준비 중" disabled />
          <GameButton compact variant="secondary" label="보유 아이템 · 방 꾸미기" onPress={() => router.push('/room-edit')} />
          <GameButton compact variant="secondary" label="내 방명록 · 준비 중" disabled />
        </GameCard>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky },
  scroll: { flexGrow: 1, paddingVertical: Spacing.four },
  content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.three },
  title: { ...GameUi.typography.number, fontSize: 43, lineHeight: 52, color: GameColors.yellow, textShadowColor: GameColors.ink, textShadowOffset: { width: 3, height: 4 }, textShadowRadius: 0 },
  body: { ...GameUi.typography.body, color: GameColors.ink },
  notice: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '700', backgroundColor: GameColors.cream, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12, padding: 12 },
  summaries: { flexDirection: 'row', gap: 8 },
  summary: { flex: 1, minWidth: 0 },
  summaryFace: { flex: 1, padding: 10, gap: 8 },
  summaryTitle: { ...GameUi.typography.caption, color: GameColors.ink, fontWeight: '800' },
  summaryValue: { ...GameUi.typography.number, color: GameColors.ink, fontSize: 18, lineHeight: 27 },
});
