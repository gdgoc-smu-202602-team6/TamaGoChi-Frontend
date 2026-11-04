import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { UiIcon } from '@/components/ui/ui-icon';
import { GameCard } from '@/components/ui/game-card';
import { PixelIcon } from '@/components/ui/pixel-icon';
import { PixelNumber } from '@/components/ui/pixel-number';
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
  const disabled = actionDisabled || !onStartStudy;
  const clock = formatStudyClock(home.todayStudySeconds);
  return (
    <GameCard>
      <View style={styles.heading}><PixelIcon name="hourglass" size={20} /><Text style={styles.title}>오늘 공부 시간</Text></View>
      <PixelNumber value={clock} label={`오늘 누적 공부시간 ${clock}`} height={60} />
      <View style={styles.progressBlock}>
        <View style={styles.row}>
          <Text style={[styles.progressTitle, { color: GameColors.greenDark }]}>오늘 출석</Text>
          <Text style={styles.caption}>{attendance.achieved ? '출석 완료' : `출석까지 ${formatRemainingMinutes(attendance.requiredSeconds - attendance.studySeconds)}`}</Text>
        </View>
        <ProgressMeter value={attendance.studySeconds} target={attendance.requiredSeconds} label="오늘 출석 진행률" />
      </View>
      {hasBugs ? (
        <View style={styles.progressBlock}>
          <View style={styles.row}>
            <Text style={[styles.progressTitle, { color: '#4E2C9E' }]}>버그 퇴치</Text>
            <Text style={styles.caption}>다음 1마리까지 {formatRemainingMinutes(bugs.requiredSeconds - bugs.progressSeconds)}</Text>
          </View>
          <ProgressMeter value={bugs.progressSeconds} target={bugs.requiredSeconds} label="다음 버그 퇴치 진행률" color={GameColors.lavender} />
        </View>
      ) : null}
      <View style={styles.playArea}>
        <View style={styles.playWrap}>
          <View style={styles.playLip} />
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel ?? '공부 시작'} accessibilityState={{ disabled, busy: actionDisabled }} disabled={disabled} onPress={onStartStudy} style={({ pressed }) => [styles.play, pressed && styles.pressed, disabled && styles.dim]}>
            {actionDisabled ? <ActivityIndicator color={GameColors.ink} /> : <UiIcon name="play" size={34} color={GameColors.ink} fill={GameColors.paper} />}
          </Pressable>
        </View>
      </View>
      {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
    </GameCard>
  );
}

const PLAY = 76;
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.one },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { ...GameUi.typography.title, fontSize: 16, color: GameColors.ink },
  caption: { ...GameUi.typography.caption, fontWeight: '700', color: GameColors.inkMuted },
  progressBlock: { gap: 6 },
  progressTitle: { ...GameUi.typography.caption, fontWeight: '800' },
  error: { ...GameUi.errorText, textAlign: 'center' },
  playArea: { alignItems: 'center', paddingTop: 4 },
  playWrap: { width: PLAY, height: PLAY + GameUi.depth },
  playLip: { position: 'absolute', left: 0, right: 0, bottom: 0, top: GameUi.depth, borderRadius: PLAY / 2, backgroundColor: GameColors.ink },
  play: { width: PLAY, height: PLAY, borderRadius: PLAY / 2, backgroundColor: GameColors.green, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, justifyContent: 'center', alignItems: 'center', paddingLeft: 4 },
  pressed: { transform: [{ translateY: GameUi.depth }] },
  dim: { opacity: .6 },
});
