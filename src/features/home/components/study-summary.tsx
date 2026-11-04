import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { UiIcon } from '@/components/ui/ui-icon';
import { GameCard } from '@/components/ui/game-card';
import { PixelIcon } from '@/components/ui/pixel-icon';
import { ProgressMeter } from '@/components/ui/progress-meter';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { HomeOverview } from '@/types/home';
import { formatRemainingMinutes, formatStudyClock } from '@/utils/format-duration';

type StudySummaryProps = {
  home: HomeOverview;
  onStartStudy?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  actionError?: string | null;
};

export function StudySummary({ home, onStartStudy, actionLabel, actionDisabled, actionError }: StudySummaryProps) {
  const { attendance, bugs } = home;
  const hasBugs = bugs.count > 0;
  return (
    <GameCard>
      <View style={styles.row}>
        <View style={styles.heading}><PixelIcon name="hourglass" size={21} /><Text style={styles.title}>오늘의 공부 시간</Text></View>
      </View>
      <View style={styles.timeBlock}>
        <Text accessibilityLabel={`오늘 누적 공부시간 ${formatStudyClock(home.todayStudySeconds)}`} adjustsFontSizeToFit numberOfLines={1} style={styles.clock}>{formatStudyClock(home.todayStudySeconds)}</Text>
      </View>
      <View style={styles.progressBlock}>
        <View style={styles.row}>
          <Text style={styles.progressTitle}>출석</Text>
          <Text style={styles.caption}>{attendance.achieved ? '오늘 출석 완료!' : `${formatRemainingMinutes(attendance.requiredSeconds - attendance.studySeconds)} 더 공부하면 출석!`}</Text>
        </View>
        <ProgressMeter value={attendance.studySeconds} target={attendance.requiredSeconds} label="오늘 출석 진행률" />
      </View>
      {hasBugs ? (
        <View style={styles.progressBlock}>
          <View style={styles.row}>
            <Text style={styles.progressTitle}>버그 퇴치</Text>
            <Text style={styles.caption}>다음 1마리까지 {formatRemainingMinutes(bugs.requiredSeconds - bugs.progressSeconds)}</Text>
          </View>
          <ProgressMeter value={bugs.progressSeconds} target={bugs.requiredSeconds} label="다음 버그 퇴치 진행률" color={GameColors.lavender} />
        </View>
      ) : null}
      <View style={styles.playArea}><Pressable accessibilityRole="button" accessibilityLabel={actionLabel ?? '공부 시작'} accessibilityState={{ disabled: actionDisabled || !onStartStudy, busy: actionDisabled }} disabled={actionDisabled || !onStartStudy} onPress={onStartStudy} style={({ pressed }) => [styles.play, (pressed || actionDisabled) && styles.dim]}>
        {actionDisabled ? <ActivityIndicator color={GameColors.paper} /> : <UiIcon name="play" size={30} color={GameColors.paper} />}
      </Pressable></View>
      {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
    </GameCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.one },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { ...GameUi.typography.title, fontSize: 16, color: GameColors.ink },
  timeBlock: { gap: Spacing.one, alignItems: 'stretch' },
  clock: { ...GameUi.typography.number, fontSize: 42, lineHeight: 58, fontWeight: '500', color: GameColors.ink, textAlign: 'center', letterSpacing: -1.5 },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted, textAlign: 'center' },
  progressBlock: { gap: Spacing.two },
  progressTitle: { ...GameUi.typography.caption, color: GameColors.ink, fontWeight: '800' },
  error: { ...GameUi.typography.body, color: GameColors.coral, textAlign: 'center' },
  playArea: { alignItems: 'center', paddingTop: 8 },
  play: { width: 66, height: 66, borderRadius: 33, backgroundColor: GameColors.accent, justifyContent: 'center', alignItems: 'center', paddingLeft: 3 },
  dim: { opacity: .5 },
});
