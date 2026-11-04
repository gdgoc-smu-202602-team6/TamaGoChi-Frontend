import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterSprite } from '@/components/character-sprite';
import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { PixelNumber } from '@/components/ui/pixel-number';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StudyRules } from '@/constants/study';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { useHome } from '@/features/home/hooks/use-home';
import { useElapsedTime } from '@/features/study/hooks/use-elapsed-time';
import { studyErrorMessage } from '@/services/study';
import { useStudy } from '@/state/study-context';
import { formatStudyClock } from '@/utils/format-duration';
import { AppBlockingNotice } from '@/features/app-blocking/components/app-blocking-notice';

// Fixed star field for the v4 focus screen. Decorative only.
const stars = [[8, 6], [22, 14], [41, 4], [63, 11], [84, 7], [93, 19], [12, 31], [76, 28], [5, 52], [94, 47], [17, 71], [86, 66], [35, 88], [62, 93], [91, 86], [48, 24]] as const;

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

  const clock = formatStudyClock(elapsed);
  const accessories = home.status === 'ready' ? home.data.room.appearance?.items : undefined;
  return (
    <SafeAreaView style={styles.screen}><ScreenHeader title="공부 중" tone="dark" actions={state.session ? <Text style={styles.status}>진행 중</Text> : undefined} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {stars.map(([left, top], index) => <View key={index} style={[styles.star, { left: `${left}%`, top: `${top}%`, opacity: index % 3 ? .45 : .8 }]} />)}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          {state.status === 'loading' ? (
            <GameCard><ActivityIndicator color={GameColors.ink} /><Text style={styles.cardBody}>진행 중인 공부를 확인하고 있어요.</Text></GameCard>
          ) : state.status === 'error' ? (
            <GameCard>
              <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text>
              <GameButton label="다시 확인" onPress={() => { void refresh(); }} />
            </GameCard>
          ) : !state.session ? (
            <GameCard>
              <Text style={styles.cardBody}>진행 중인 공부가 없어요.</Text>
              <GameButton label="내 방으로" onPress={() => router.dismissTo('/')} />
            </GameCard>
          ) : <>
            <View style={styles.hero}>
              <View style={[styles.glow, styles.glowOuter]} />
              <View style={styles.glow} />
              <View style={styles.character}><CharacterSprite accessories={accessories} label="공부 중인 내 캐릭터" /></View>
            </View>
            <View style={styles.timer}>
              <Text style={styles.kicker}>이번 공부</Text>
              <PixelNumber value={clock} label={`경과 공부시간 ${clock}`} height={72} tone="dark" />
              <Text style={styles.body}>앱을 나가도 공부 시간은 계속 쌓여요.</Text>
              <Text style={styles.caption}>한 번의 공부는 최대 {StudyRules.maxSessionSeconds / 3600}시간까지 인정돼요.</Text>
            </View>
            <View style={styles.actions}>
              <GameButton variant="secondary" icon="stop" label={operation === 'finish' ? '공부 마무리 중…' : '공부 끝내기'} onPress={finish} disabled={operation !== null} />
              {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
              <View style={styles.blocking}>
                <AppBlockingNotice compact tone="dark" />
                <GameButton compact variant="secondary" label="앱 차단 안내" disabled={operation !== null} onPress={() => router.push('/app-blocking')} />
              </View>
            </View>
          </>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.night },
  star: { position: 'absolute', width: 3, height: 3, backgroundColor: GameColors.skyLight },
  scroll: { flexGrow: 1, paddingVertical: Spacing.three },
  content: { flexGrow: 1, width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.four },
  status: { ...GameUi.typography.caption, fontWeight: '800', color: GameColors.ink, backgroundColor: GameColors.green, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: GameColors.ink, overflow: 'hidden' },
  hero: { alignItems: 'center', justifyContent: 'center', height: 170, marginTop: Spacing.two },
  glow: { position: 'absolute', width: 132, height: 132, borderRadius: 66, backgroundColor: GameColors.yellow, opacity: .09 },
  glowOuter: { width: 176, height: 176, borderRadius: 88, opacity: .05 },
  character: { width: 104, height: 130 },
  timer: { alignItems: 'center', gap: Spacing.two },
  kicker: { ...GameUi.typography.body, fontWeight: '800', color: GameColors.skyLight },
  body: { ...GameUi.typography.body, color: GameColors.cream, textAlign: 'center', marginTop: Spacing.one },
  caption: { ...GameUi.typography.caption, color: GameColors.inkSoft, textAlign: 'center' },
  cardBody: { ...GameUi.typography.body, color: GameColors.ink, textAlign: 'center' },
  actions: { gap: Spacing.three, marginTop: 'auto' },
  blocking: { gap: 10, padding: Spacing.three, borderRadius: GameUi.radius.card, backgroundColor: GameColors.nightDeep },
  error: { ...GameUi.errorText, textAlign: 'center' },
});
