import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameScreen } from '@/components/ui/game-screen';
import { PixelIcon } from '@/components/ui/pixel-icon';
import { StudyRules } from '@/constants/study';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { RoomPreview } from '@/features/home/components/room-preview';
import { useHome } from '@/features/home/hooks/use-home';
import { useElapsedTime } from '@/features/study/hooks/use-elapsed-time';
import { studyErrorMessage } from '@/services/study';
import { useStudy } from '@/state/study-context';
import { formatStudyClock } from '@/utils/format-duration';
import { AppBlockingNotice } from '@/features/app-blocking/components/app-blocking-notice';

export function StudyScreen() {
  const { state, operation, revision, refresh, finishStudy } = useStudy();
  const { state: home } = useHome(undefined, revision);
  const elapsed = useElapsedTime(state.session);
  const [error, setError] = useState<string | null>(null);
  const finishing = useRef(false);
  const expiryCheck = useRef<string | null>(null);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (state.status === 'ready' && !state.session && state.completedSessionId) {
      router.replace({ pathname: '/study-result/[sessionId]', params: { sessionId: state.completedSessionId } });
    }
  }, [state.status, state.session, state.completedSessionId]);
  useEffect(() => {
    if (state.session?.timing && elapsed >= state.session.timing.maxSeconds && expiryCheck.current !== state.session.id) {
      expiryCheck.current = state.session.id;
      void refresh();
    }
  }, [elapsed, state.session, refresh]);

  async function finish() {
    if (!state.session || finishing.current) return;
    finishing.current = true;
    setError(null);
    try {
      const result = await finishStudy(state.session.id);
      router.replace({ pathname: '/study-result/[sessionId]', params: { sessionId: result.sessionId } });
    } catch (reason) {
      setError(studyErrorMessage(reason));
    } finally {
      finishing.current = false;
    }
  }

  return (
    <GameScreen title="공부 모드" subtitle="지금 쌓는 시간이 내 방을 바꿔요.">
      {state.status === 'loading' ? (
        <GameCard><ActivityIndicator color={GameColors.ink} /><Text style={styles.body}>진행 중인 공부를 확인하고 있어요.</Text></GameCard>
      ) : state.status === 'error' ? (
        <GameCard>
          <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text>
          <GameButton label="다시 확인" onPress={() => { void refresh(); }} />
        </GameCard>
      ) : !state.session ? (
        <GameCard>
          <Text style={styles.body}>진행 중인 공부가 없어요.</Text>
          <GameButton label="내 방으로" onPress={() => router.dismissTo('/')} />
        </GameCard>
      ) : <>
        {home.status === 'ready' && <RoomPreview bugs={home.data.bugs.count} name={home.data.room.name} characterLabel={home.data.room.characterLabel} appearance={home.data.room.appearance} />}
        <GameCard>
          <View style={styles.statusRow}>
            <View style={styles.statusLabel}><PixelIcon name="hourglass" size={23} /><Text style={styles.title}>공부한 시간</Text></View>
            <Text style={styles.status}>진행 중</Text>
          </View>
          <Text accessibilityLabel={`경과 공부시간 ${formatStudyClock(elapsed)}`} adjustsFontSizeToFit numberOfLines={1} style={styles.clock}>{formatStudyClock(elapsed)}</Text>
          <Text style={styles.body}>앱을 나가도 공부 시간은 계속 쌓여요.</Text>
          <Text style={styles.caption}>한 번의 공부는 최대 {StudyRules.maxSessionSeconds / 3600}시간까지 인정돼요.</Text>
          <GameButton label={operation === 'finish' ? '공부 마무리 중…' : '공부 끝내기'} onPress={finish} disabled={operation !== null} />
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <AppBlockingNotice compact />
          <GameButton compact variant="secondary" label="앱 차단 안내" disabled={operation !== null} onPress={() => router.push('/app-blocking')} />
        </GameCard>
      </>}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, flexWrap: 'wrap' },
  statusLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { ...GameUi.typography.title, color: GameColors.ink, fontSize: 17 },
  status: { ...GameUi.typography.caption, color: GameColors.ink, backgroundColor: GameColors.green, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: GameColors.ink },
  clock: { ...GameUi.typography.number, fontSize: 55, lineHeight: 76, letterSpacing: -2, color: GameColors.ink, textAlign: 'center' },
  body: { ...GameUi.typography.body, color: GameColors.ink, textAlign: 'center' },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted, textAlign: 'center' },
  error: { ...GameUi.typography.body, color: GameColors.coral, textAlign: 'center' },
});
