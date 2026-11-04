import { router } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { IconButton } from '@/components/ui/icon-button';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { formatStudySummary } from '@/utils/profile';
import { ProfileCard } from './components/profile-card';
import { WeeklyChart } from './components/weekly-chart';
import { useProfile } from './hooks/use-profile';
import { useProfileInventory } from './hooks/use-profile-inventory';

export function ProfileScreen() {
  const profile = useProfile(), inventory = useProfileInventory();
  const data = profile.data;
  const summaries = data ? [
    { title: '오늘', value: formatStudySummary(data.todaySeconds), color: GameColors.yellow },
    { title: '이번 주', value: formatStudySummary(data.weekSeconds), color: GameColors.pink },
    { title: '연속 출석', value: `${data.attendanceStreak}일`, color: '#8FD97A' },
  ] : [];
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}><ScreenHeader title="마이" actions={<IconButton icon="settings" label="설정" onPress={() => router.push('/settings')} />} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={profile.refreshing || inventory.loading} onRefresh={() => { void profile.refresh(); void inventory.refresh(); }} tintColor={GameColors.ink} />}>
      <View style={styles.content}>
        {profile.refreshing && <ActivityIndicator color={GameColors.ink} accessibilityLabel="마이 불러오는 중" />}
        {profile.error && <GameCard><Text accessibilityRole="alert" style={styles.body}>{profile.error}</Text><GameButton compact label="다시 불러오기" disabled={profile.refreshing || profile.saving} onPress={() => { void profile.refresh(); }} /></GameCard>}
        {profile.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{profile.notice}</Text>}
        {data && <>
          <ProfileCard profile={data} inventory={inventory.data} inventoryLoading={inventory.loading} />
          <View style={styles.summaries}>{summaries.map(summary => <GameCard key={summary.title} style={styles.summary} contentStyle={[styles.summaryFace, { backgroundColor: summary.color }]}><Text style={styles.summaryTitle}>{summary.title}</Text><Text style={styles.summaryValue}>{summary.value}</Text></GameCard>)}</View>
          <WeeklyChart profile={data} />
        </>}
        {inventory.error && <GameCard><Text accessibilityRole="alert" style={styles.body}>보유·장착 정보를 확인하지 못했어요.</Text><GameButton compact label="아이템 다시 확인" onPress={() => { void inventory.refresh(); }} /></GameCard>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky },
  scroll: { flexGrow: 1, paddingVertical: Spacing.four },
  content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.three },
  body: { ...GameUi.typography.body, color: GameColors.ink },
  notice: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '700', backgroundColor: GameColors.cream, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12, padding: 12, overflow: 'hidden' },
  summaries: { flexDirection: 'row', gap: 8 },
  summary: { flex: 1, minWidth: 0 },
  summaryFace: { flex: 1, padding: 12, gap: 6 },
  summaryTitle: { ...GameUi.typography.caption, color: GameColors.ink, fontWeight: '800' },
  summaryValue: { ...GameUi.typography.number, color: GameColors.ink, fontSize: 18, lineHeight: 26 },
});
