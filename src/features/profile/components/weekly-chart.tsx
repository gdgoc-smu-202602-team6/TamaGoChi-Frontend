import { StyleSheet, Text, View } from 'react-native';

import { GameCard } from '@/components/ui/game-card';
import { GameColors, GameUi } from '@/constants/theme';
import type { ProfileOverview } from '@/types/profile';
import { formatStudySummary } from '@/utils/profile';

const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
const chartHeight = 144, labelSpace = 16;
/** Short bar label that fits a seventh of the card: "20분", "1.5시간", "3시간". */
function barLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}분` : `${Math.round(minutes / 6) / 10}시간`;
}
export function WeeklyChart({ profile }: { profile: ProfileOverview }) {
  const maximum = Math.max(1, ...profile.week.flatMap(day => [day.studiedSeconds, day.goalMinutes * 60]));
  const scale = (seconds: number) => (chartHeight - labelSpace) * seconds / maximum;
  const goal = profile.week.find(day => day.day === profile.serviceDay)?.goalMinutes;
  return <GameCard contentStyle={styles.surface}>
    {/* The legend names the dashed line, so the chart needs no explanatory sentence. */}
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>주간 공부 기록</Text>
      {goal !== undefined && <View style={styles.legend}><View style={styles.legendLine} /><Text style={styles.caption}>목표 {formatStudySummary(goal * 60)}</Text></View>}
    </View>
    <View style={styles.chart}>
      {profile.week.map((day, index) => <View key={day.day} style={styles.column} accessible accessibilityLabel={`${day.day} ${weekdays[index]}요일, 공부 ${formatStudySummary(day.studiedSeconds)}, 목표 ${formatStudySummary(day.goalMinutes * 60)}, ${day.goalMet ? '목표 달성' : '목표 달성 전'}`}>
        <View style={styles.plot}>
          <View style={[styles.goal, { bottom: scale(day.goalMinutes * 60) }]} />
          {day.studiedSeconds >= 60 && <Text style={styles.value}>{barLabel(day.studiedSeconds)}</Text>}
          {day.studiedSeconds > 0 && <View style={[styles.bar, { height: scale(day.studiedSeconds), backgroundColor: day.goalMet ? GameColors.green : day.day === profile.serviceDay ? GameColors.yellow : '#9FD0FF' }]} />}
        </View>
        <Text style={[styles.day, day.day === profile.serviceDay && styles.today]}>{weekdays[index]}</Text>
      </View>)}
    </View>
  </GameCard>;
}
const styles = StyleSheet.create({
  surface: { backgroundColor: GameColors.paper },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  title: { ...GameUi.typography.title, fontSize: 17, color: GameColors.ink },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 18, borderTopWidth: 2, borderColor: GameColors.pink, borderStyle: 'dashed' },
  caption: { ...GameUi.typography.caption, fontWeight: '700', color: GameColors.inkMuted },
  value: { ...GameUi.typography.caption, fontSize: 10, lineHeight: 14, fontWeight: '800', color: GameColors.ink, marginBottom: 2 },
  chart: { flexDirection: 'row', marginTop: 10 },
  column: { flex: 1, minWidth: 0 },
  plot: { height: chartHeight, justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: GameUi.borderWidth, borderBottomColor: GameColors.ink },
  bar: { width: '64%', minHeight: 4, borderWidth: GameUi.borderWidth, borderBottomWidth: 0, borderColor: GameColors.ink, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  goal: { position: 'absolute', width: '100%', borderTopWidth: 2, borderColor: GameColors.pink, borderStyle: 'dashed' },
  day: { ...GameUi.typography.caption, color: GameColors.inkMuted, textAlign: 'center', marginTop: 8, paddingVertical: 2 },
  today: { color: GameColors.ink, fontWeight: '900', backgroundColor: GameColors.yellow, borderRadius: 6, overflow: 'hidden' },
});
