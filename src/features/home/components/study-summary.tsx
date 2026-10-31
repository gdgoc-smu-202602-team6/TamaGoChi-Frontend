import { StyleSheet, Text, View } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { PixelIcon } from '@/components/ui/pixel-icon';
import { ProgressMeter } from '@/components/ui/progress-meter';
import { StudyRules } from '@/constants/study';
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
        <Text style={styles.today}>TODAY</Text>
      </View>
      <View style={styles.timeBlock}>
        <Text accessibilityLabel={`오늘 누적 공부시간 ${formatStudyClock(home.todayStudySeconds)}`} adjustsFontSizeToFit numberOfLines={1} style={styles.clock}>{formatStudyClock(home.todayStudySeconds)}</Text>
        <Text style={styles.caption}>정해진 시간 없이, 나만의 속도로.</Text>
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
      ) : <Text style={styles.cleanMessage}>방이 반짝반짝! 오늘도 함께 공부해요.</Text>}
      <GameButton label={actionLabel ?? (hasBugs ? '▶ 공부해서 버그 퇴치' : '▶ 공부 시작!')} onPress={onStartStudy} disabled={actionDisabled} />
      {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
      <Text style={styles.reward}>1분 공부 = {StudyRules.boltPerMinute} Bolt · {StudyRules.xpPerMinute} XP</Text>
    </GameCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.one },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { ...GameUi.typography.title, fontSize: 16, color: GameColors.ink },
  today: { ...GameUi.typography.caption, fontSize: 10, color: GameColors.inkMuted },
  timeBlock: { gap: Spacing.one, alignItems: 'stretch' },
  clock: { ...GameUi.typography.number, fontSize: 49, lineHeight: 62, color: GameColors.ink, textAlign: 'center', letterSpacing: -1.5 },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted, textAlign: 'center' },
  progressBlock: { gap: Spacing.two },
  progressTitle: { ...GameUi.typography.caption, color: GameColors.ink, fontWeight: '800' },
  cleanMessage: { ...GameUi.typography.body, color: GameColors.greenDark, textAlign: 'center' },
  reward: { ...GameUi.typography.caption, color: GameColors.inkMuted, textAlign: 'center', fontSize: 11 },
  error: { ...GameUi.typography.body, color: GameColors.coral, textAlign: 'center' },
});
