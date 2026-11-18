import { StyleSheet, Text, View } from 'react-native';
import { RoundActionButton } from '@/components/ui/round-action-button';
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
  const { attendance } = home;
  const clock = formatStudyClock(home.todayStudySeconds);
  return (
    <GameCard>
      <View style={styles.heading}><PixelIcon name="hourglass" size={20} /><Text style={styles.title}>오늘 공부 시간</Text></View>
      <PixelNumber value={clock} label={`오늘 누적 공부시간 ${clock}`} height={72} />
      <View style={styles.progressBlock}>
        <View style={styles.row}>
          <Text style={[styles.progressTitle, { color: GameColors.greenDark }]}>오늘 출석</Text>
          <Text style={styles.caption}>{attendance.achieved ? '출석 완료' : `출석까지 ${formatRemainingMinutes(attendance.requiredSeconds - attendance.studySeconds)}`}</Text>
        </View>
        <ProgressMeter value={attendance.studySeconds} target={attendance.requiredSeconds} label="오늘 출석 진행률" />
      </View>
      <View style={styles.playArea}>
        <RoundActionButton icon="play" label={actionLabel ?? '공부 시작'} onPress={onStartStudy} busy={actionDisabled} iconOffset={4} />
      </View>
      {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
    </GameCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.one },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { ...GameUi.typography.title, fontSize: 16, color: GameColors.ink },
  caption: { ...GameUi.typography.caption, fontWeight: '700', color: GameColors.inkMuted },
  progressBlock: { gap: 6 },
  progressTitle: { ...GameUi.typography.caption, fontWeight: '800' },
  error: { ...GameUi.errorText, textAlign: 'center' },
  playArea: { alignItems: 'center', paddingTop: 4 },
});
