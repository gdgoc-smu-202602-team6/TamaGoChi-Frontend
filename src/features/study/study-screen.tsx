import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterSprite } from '@/components/character-sprite';
import { GameButton } from '@/components/ui/game-button';
import { GameConfirmDialog, GameInfoDialog } from '@/components/ui/game-confirm-dialog';
import { RoundActionButton } from '@/components/ui/round-action-button';
import { UiIcon } from '@/components/ui/ui-icon';
import { GameCard } from '@/components/ui/game-card';
import { PixelNumber } from '@/components/ui/pixel-number';
import { ProgressMeter } from '@/components/ui/progress-meter';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { useHome } from '@/features/home/hooks/use-home';
import { useElapsedTime } from '@/features/study/hooks/use-elapsed-time';
import { studyErrorMessage } from '@/services/study';
import { useStudy } from '@/state/study-context';
import { formatStudyClock } from '@/utils/format-duration';
import { appBlockingMessage, appBlockingStatus } from '@/features/app-blocking/components/app-blocking-notice';

// Fixed star field for the v4 focus screen. Decorative only.
const stars = [[8, 6], [22, 14], [41, 4], [63, 11], [84, 7], [93, 19], [12, 31], [76, 28], [5, 52], [94, 47], [17, 71], [86, 66], [35, 88], [62, 93], [91, 86], [48, 24]] as const;

export function StudyScreen() {
  const { state, operation, revision, refresh, finishStudy } = useStudy();
  const { state: home } = useHome(undefined, revision);
  const elapsed = useElapsedTime(state.session);
  const [error, setError] = useState<string | null>(null), [blockingInfo, setBlockingInfo] = useState(false), [confirming, setConfirming] = useState(false);
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
    setConfirming(false);
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

  // Today's total from the server already holds this session up to the moment it was read, so only
  // the seconds since then are added. Re-anchored whenever a fresh home overview arrives.
  const homeData = home.status === 'ready' ? home.data : null;
  const [anchor, setAnchor] = useState<{ data: typeof homeData; elapsed: number }>({ data: null, elapsed: 0 });
  if (homeData !== anchor.data) setAnchor({ data: homeData, elapsed });
  const today = anchor.data ? anchor.data.todayStudySeconds + Math.max(0, elapsed - anchor.elapsed) : null;
  const attendance = anchor.data?.attendance;
  const clock = formatStudyClock(elapsed);
  const equipped = homeData?.room.appearance?.items;
  return (
    <SafeAreaView style={styles.screen}><ScreenHeader title="공부 중" tone="dark" />
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
              <View style={styles.character}><CharacterSprite items={equipped} label="공부 중인 내 캐릭터" /></View>
            </View>
            <View style={styles.timer}>
              <Text style={styles.kicker}>이번 공부</Text>
              <PixelNumber value={clock} label={`경과 공부시간 ${clock}`} height={72} tone="dark" />
            </View>
            {today !== null && attendance && <View style={styles.today}>
              <View style={styles.todayRow}>
                <Text style={styles.todayLabel}>오늘 {formatStudyClock(today)}</Text>
                <Text style={styles.todayLabel}>{today >= attendance.requiredSeconds || attendance.achieved ? '출석 완료' : `출석까지 ${Math.ceil((attendance.requiredSeconds - today) / 60)}분`}</Text>
              </View>
              <ProgressMeter value={today} target={attendance.requiredSeconds} label="오늘 출석 진행률" />
            </View>}
            <View style={styles.actions}>
              <RoundActionButton icon="stop" label={operation === 'finish' ? '공부 마무리 중' : '공부 끝내기'} onPress={() => setConfirming(true)} disabled={operation !== null} busy={operation === 'finish'} color={GameColors.alert} iconColor={GameColors.paper} />
              {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
              {/* Builds have no app blocking yet: say so quietly; the chip explains it without leaving the timer. */}
              <Pressable accessibilityRole="button" accessibilityLabel={`${appBlockingStatus}, 안내 보기`} onPress={() => setBlockingInfo(true)} style={({ pressed }) => [styles.blocking, pressed && styles.blockingPressed]}>
                <UiIcon name="info" size={16} color={GameColors.inkSoft} />
                <Text style={styles.blockingText}>{appBlockingStatus}</Text>
              </Pressable>
              {/* No pause exists, so one stray tap must not end the session. The clock keeps running behind the dialog. */}
              <GameConfirmDialog visible={confirming} title="공부를 끝낼까요?" message={elapsed < 60 ? '1분이 안 되면 보상이 없어요.' : `이번 공부 ${clock}`}
                confirmLabel="끝내기" cancelLabel="계속 공부" onConfirm={() => { void finish(); }} onCancel={() => setConfirming(false)} />
              <GameInfoDialog visible={blockingInfo} title={appBlockingStatus} message={appBlockingMessage} onClose={() => setBlockingInfo(false)} />
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
  hero: { alignItems: 'center', justifyContent: 'center', height: 170, marginTop: Spacing.two },
  glow: { position: 'absolute', width: 132, height: 132, borderRadius: 66, backgroundColor: GameColors.yellow, opacity: .09 },
  glowOuter: { width: 176, height: 176, borderRadius: 88, opacity: .05 },
  character: { width: 104, height: 130 },
  timer: { alignItems: 'center', gap: Spacing.two },
  kicker: { ...GameUi.typography.body, fontWeight: '800', color: GameColors.skyLight },
  today: { gap: 8, width: '100%', maxWidth: 300, alignSelf: 'center' },
  todayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  todayLabel: { ...GameUi.typography.caption, fontWeight: '700', color: GameColors.skyLight },
  cardBody: { ...GameUi.typography.body, color: GameColors.ink, textAlign: 'center' },
  actions: { gap: Spacing.three, marginTop: 'auto', alignItems: 'center' },
  blocking: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22 },
  blockingPressed: { backgroundColor: 'rgba(255, 244, 214, 0.1)' },
  blockingText: { ...GameUi.typography.caption, fontWeight: '700', color: GameColors.inkSoft },
  error: { ...GameUi.errorText, textAlign: 'center' },
});
