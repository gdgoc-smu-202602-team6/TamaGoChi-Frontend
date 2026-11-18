import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameScreen } from '@/components/ui/game-screen';
import { PixelIcon } from '@/components/ui/pixel-icon';
import { PixelNumber } from '@/components/ui/pixel-number';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { useStudyResult } from '@/features/study/hooks/use-study-result';
import { formatStudyClock } from '@/utils/format-duration';
import { formatStudySummary } from '@/utils/profile';
import { useStudy } from '@/state/study-context';
import { studyErrorMessage } from '@/services/study';

type Chip = { label: string; background: string; color: string };

export function StudyResultScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const { state, retry } = useStudyResult(typeof sessionId === 'string' ? sessionId : '');
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

  const levelUp = result.levelAfter !== undefined && result.levelBefore !== undefined && result.levelAfter > result.levelBefore;
  const chips: Chip[] = [
    { label: `+${result.studyXp} XP`, background: GameColors.skyLight, color: '#2447A3' },
    ...(result.attendanceXp > 0 ? [{ label: `출석 보너스 +${result.attendanceXp} XP`, background: GameColors.yellowLight, color: '#634A00' }] : []),
    ...(result.goalXp > 0 ? [{ label: `목표 달성 +${result.goalXp} XP`, background: GameColors.yellowLight, color: '#634A00' }] : []),
    ...(result.bugsRemoved > 0 ? [{ label: `버그 ${result.bugsRemoved}마리 퇴치`, background: GameColors.greenLight, color: GameColors.greenDark }] : []),
    ...(result.heartsChange ? [{ label: `Heart ${result.heartsChange > 0 ? '+' : ''}${result.heartsChange}`, background: GameColors.alertLight, color: GameColors.coral }] : []),
    ...(levelUp ? [{ label: `레벨 업 LV.${result.levelBefore} → LV.${result.levelAfter}`, background: '#E6DCFF', color: '#4E2C9E' }] : []),
  ];
  const returnButton = <>
    {returnError && <Text accessibilityRole="alert" style={styles.error}>{returnError}</Text>}
    <GameButton icon="home" label={returning ? '내 방으로 이동 중…' : '내 방으로'} disabled={returning} onPress={() => { void finishViewing(); }} />
  </>;
  // Seconds under a minute are dropped, so a sub-minute session earns nothing: no chest or "clear".
  if (result.creditedSeconds < 60 && result.bolt === 0 && result.totalXp === 0 && chips.length === 1) return (
    <GameScreen title="공부 종료" centered>
      <GameCard contentStyle={styles.panel}>
        <Text accessibilityRole="header" style={styles.title}>1분이 안 됐어요</Text>
        <Text style={styles.body}>이번 공부 {formatStudyClock(result.elapsedSeconds)}</Text>
        <Text style={styles.caption}>보상은 1분부터 쌓여요.</Text>
      </GameCard>
      {returnButton}
    </GameScreen>
  );
  return (
    <GameScreen title="공부 완료" centered>
      <GameCard contentStyle={styles.panel}>
        <View style={styles.chest}><PixelIcon name="chest" size={92} /></View>
        <Text style={styles.kicker}>STAGE CLEAR</Text>
        <Text accessibilityRole="header" style={styles.title}>{formatStudySummary(result.creditedSeconds)} 공부했어요</Text>
        <View style={styles.reward}>
          <PixelIcon name="bolt" size={40} label="Bolt" />
          <PixelNumber inline value={`+${result.bolt}`} label={`Bolt ${result.bolt}개 획득`} height={58} />
          <Text style={styles.unit} importantForAccessibility="no" accessibilityElementsHidden>Bolt</Text>
        </View>
        <View style={styles.chips}>{chips.map(chip => <Text key={chip.label} style={[styles.chip, { backgroundColor: chip.background, color: chip.color }]}>{chip.label}</Text>)}</View>
        {result.totalXp !== result.studyXp && <Text style={styles.caption}>총 {result.totalXp} XP</Text>}
        {result.elapsedSeconds > result.creditedSeconds && <Text style={styles.caption}>기록한 시간 {formatStudyClock(result.elapsedSeconds)} 중 최대 12시간을 인정했어요.</Text>}
      </GameCard>
      {returnButton}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', paddingVertical: Spacing.four, gap: Spacing.two },
  chest: { width: 92, height: 60, alignItems: 'center', justifyContent: 'center' },
  kicker: { ...GameUi.typography.caption, fontSize: 13, letterSpacing: 1.5, fontWeight: '900', color: GameColors.coral, marginTop: Spacing.two },
  title: { ...GameUi.typography.title, fontSize: 22, lineHeight: 30, color: GameColors.ink, textAlign: 'center' },
  reward: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, marginVertical: Spacing.one },
  unit: { ...GameUi.typography.title, fontSize: 18, color: GameColors.ink, alignSelf: 'flex-end', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: { ...GameUi.typography.caption, fontSize: 13, fontWeight: '800', borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: GameUi.radius.badge, paddingHorizontal: 12, paddingVertical: 5, overflow: 'hidden' },
  body: { ...GameUi.typography.body, color: GameColors.ink, textAlign: 'center' },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted, textAlign: 'center' },
  error: { ...GameUi.errorText, textAlign: 'center' },
});
