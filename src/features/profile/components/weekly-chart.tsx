import { StyleSheet, Text, View } from 'react-native';

import { GameCard } from '@/components/ui/game-card';
import { GameColors, GameUi } from '@/constants/theme';
import type { ProfileOverview } from '@/types/profile';
import { formatStudySummary } from '@/utils/profile';

const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
const chartHeight = 144;
export function WeeklyChart({ profile }: { profile: ProfileOverview }) {
  const maximum = Math.max(1, ...profile.week.flatMap(day => [day.studiedSeconds, day.goalMinutes * 60]));
  return <GameCard contentStyle={styles.surface}>
    <Text accessibilityRole="header" style={styles.title}>주간 공부 기록</Text>
    <Text style={styles.caption}>월~일 · 점선은 각 날짜의 목표예요.</Text>
    <View style={styles.chart}>
      {profile.week.map((day, index) => <View key={day.day} style={styles.column} accessible accessibilityLabel={`${day.day} ${weekdays[index]}요일, 공부 ${formatStudySummary(day.studiedSeconds)}, 목표 ${formatStudySummary(day.goalMinutes * 60)}, ${day.goalMet ? '목표 달성' : '목표 달성 전'}`}>
        <View style={styles.plot}>
          {day.studiedSeconds > 0 && <View style={[styles.bar, { height: chartHeight * day.studiedSeconds / maximum, backgroundColor: day.goalMet ? GameColors.green : day.day === profile.serviceDay ? GameColors.yellow : GameColors.skyLight }]} />}
          <View style={[styles.goal, { bottom: chartHeight * day.goalMinutes * 60 / maximum }]} />
        </View>
        <Text style={[styles.day, day.day === profile.serviceDay && styles.today]}>{weekdays[index]}</Text>
      </View>)}
    </View>
    <Text style={styles.caption}>오늘과 이번 주에는 진행 중인 공부 시간도 포함돼요.</Text>
  </GameCard>;
}
const styles = StyleSheet.create({
  surface: { backgroundColor: GameColors.paper },
  title: { ...GameUi.typography.title, fontSize: 17, color: GameColors.ink },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted },
  chart: { flexDirection: 'row', marginTop: 10 },
  column: { flex: 1, minWidth: 0 },
  plot: { height: chartHeight, justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: GameColors.ink },
  bar: { width: '72%', borderWidth: 2, borderBottomWidth: 0, borderColor: GameColors.ink, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  goal: { position: 'absolute', width: '100%', borderTopWidth: 2, borderColor: GameColors.heart, borderStyle: 'dashed' },
  day: { ...GameUi.typography.caption, color: GameColors.inkMuted, textAlign: 'center', marginTop: 8, paddingVertical: 2 },
  today: { color: GameColors.ink, fontWeight: '900', backgroundColor: GameColors.yellow, borderRadius: 6, overflow: 'hidden' },
});
