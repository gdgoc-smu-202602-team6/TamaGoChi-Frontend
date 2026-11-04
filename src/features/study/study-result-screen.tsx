import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameScreen } from '@/components/ui/game-screen';
import { PixelIcon } from '@/components/ui/pixel-icon';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { RoomPreview } from '@/features/home/components/room-preview';
import { useHome } from '@/features/home/hooks/use-home';
import { useStudyResult } from '@/features/study/hooks/use-study-result';
import { formatStudyClock } from '@/utils/format-duration';
import { useStudy } from '@/state/study-context';
import { studyErrorMessage } from '@/services/study';

export function StudyResultScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const { state, retry } = useStudyResult(typeof sessionId === 'string' ? sessionId : '');
  const { state: home } = useHome();
  const { acknowledgeResult } = useStudy();
  const [returning, setReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const goHome = () => router.dismissTo('/');
  async function finishViewing() {
    if (returning || typeof sessionId !== 'string') return;
    setReturning(true); setReturnError(null);
    try { await acknowledgeResult(sessionId); goHome(); }
    catch (error) { setReturnError(studyErrorMessage(error)); }
    finally { setReturning(false); }
  }

  if (state.status !== 'ready') return (
    <GameScreen title="공부 결과">
      <GameCard>
        {state.status === 'loading' ? <><ActivityIndicator color={GameColors.ink} /><Text style={styles.body}>공부 결과를 불러오고 있어요.</Text></> : <>
          <Text accessibilityRole="alert" style={styles.body}>공부 결과를 불러오지 못했어요.</Text>
          <GameButton label="다시 시도" onPress={retry} />
        </>}
        <GameButton label="내 방으로" variant="secondary" onPress={goHome} />
      </GameCard>
    </GameScreen>
  );

  const result = state.result;
  if (!result) return (
    <GameScreen title="공부 결과">
      <GameCard><Text style={styles.body}>이 공부 결과를 찾지 못했어요.</Text><GameButton label="내 방으로" onPress={goHome} /></GameCard>
    </GameScreen>
  );

  return (
    <GameScreen title="공부 완료">
      {home.status === 'ready' && <View style={styles.room}><RoomPreview bugs={home.data.bugs.count} name={home.data.room.name} characterLabel={home.data.room.characterLabel} appearance={home.data.room.appearance} /></View>}
      <GameCard>
        <Text style={styles.heading}>인정된 공부 시간</Text>
        <Text accessibilityLabel={`인정된 공부시간 ${formatStudyClock(result.creditedSeconds)}`} adjustsFontSizeToFit numberOfLines={1} style={styles.clock}>{formatStudyClock(result.creditedSeconds)}</Text>
        {result.elapsedSeconds > result.creditedSeconds && <Text style={styles.body}>기록한 시간 {formatStudyClock(result.elapsedSeconds)} 중 최대 12시간을 인정했어요.</Text>}
        <View style={styles.rewards}>
          <View style={[styles.reward, { backgroundColor: GameColors.yellow }]}>
            <View style={styles.rewardLabel}><PixelIcon name="bolt" size={22} /><Text style={styles.label}>BOLT</Text></View>
            <Text style={styles.rewardNumber}>+{result.bolt}</Text>
          </View>
          <View style={[styles.reward, { backgroundColor: GameColors.lavender }]}>
            <Text style={styles.label}>XP</Text><Text style={styles.rewardNumber}>+{result.totalXp}</Text>
          </View>
        </View>
        <Text style={styles.caption}>공부 XP +{result.studyXp}</Text>
        {result.attendanceXp > 0 && <Text style={styles.bonus}>출석 달성 보너스 +{result.attendanceXp} XP</Text>}
        {result.goalXp > 0 && <Text style={styles.bonus}>하루 목표 달성 보너스 +{result.goalXp} XP</Text>}
        {result.bugsRemoved > 0 && <Text style={styles.bonus}>버그 {result.bugsRemoved}마리를 퇴치했어요!</Text>}
        {!!result.heartsChange && <Text style={styles.bonus}>Heart {result.heartsChange > 0 ? '+' : ''}{result.heartsChange}</Text>}
        {result.levelAfter !== undefined && result.levelBefore !== undefined && result.levelAfter > result.levelBefore && <Text style={styles.bonus}>레벨 업! LV.{result.levelBefore} → LV.{result.levelAfter}</Text>}
      </GameCard>
      {returnError && <Text accessibilityRole="alert" style={styles.body}>{returnError}</Text>}
      <GameButton label={returning ? '내 방으로 이동 중…' : '내 방으로'} disabled={returning} onPress={() => { void finishViewing(); }} />
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  room: { width: '100%', maxWidth: 260, alignSelf: 'center' },
  heading: { ...GameUi.typography.title, color: GameColors.ink, textAlign: 'center' },
  clock: { ...GameUi.typography.number, fontSize: 45, lineHeight: 62, color: GameColors.ink, textAlign: 'center', letterSpacing: -1.5 },
  body: { ...GameUi.typography.body, color: GameColors.ink, textAlign: 'center' },
  rewards: { flexDirection: 'row', gap: Spacing.two },
  reward: { flex: 1, padding: Spacing.three, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: GameUi.radius.button, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  rewardLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  label: { ...GameUi.typography.caption, color: GameColors.ink, fontWeight: '800' },
  rewardNumber: { ...GameUi.typography.number, fontSize: 30, color: GameColors.ink },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted, textAlign: 'center' },
  bonus: { ...GameUi.typography.body, color: GameColors.greenDark, textAlign: 'center', fontWeight: '700' },
});
