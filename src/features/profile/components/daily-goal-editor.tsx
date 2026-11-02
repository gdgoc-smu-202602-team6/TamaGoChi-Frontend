import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameInput } from '@/components/ui/game-input';
import { GameColors, GameUi } from '@/constants/theme';
import type { ProfileOverview } from '@/types/profile';
import { formatStudySummary, GoalRules, validGoalMinutes } from '@/utils/profile';

export function DailyGoalEditor({ profile, disabled, saving, onSave }: { profile: ProfileOverview; disabled: boolean; saving: boolean; onSave: (minutes: number) => void }) {
  const [open, setOpen] = useState(false), [input, setInput] = useState(String(profile.goalMinutes));
  const minutes = /^\d+$/.test(input) ? Number(input) : NaN;
  const valid = validGoalMinutes(minutes), reserved = profile.scheduledGoals.some(goal => goal.startOn === profile.tomorrow);
  return <GameCard>
    <View style={styles.row}><View style={styles.label}><Text accessibilityRole="header" style={styles.title}>하루 목표 시간</Text><Text style={styles.body}>오늘 {formatStudySummary(profile.goalMinutes * 60)}</Text></View><GameButton compact label={open ? '닫기' : '변경'} variant="secondary" disabled={disabled || reserved || saving} onPress={() => setOpen(value => !value)} /></View>
    <Text style={styles.caption}>변경한 목표는 {profile.tomorrow} 한국시간 오전 4시부터 적용돼요.</Text>
    {profile.scheduledGoals.map(goal => <Text key={goal.startOn} style={styles.scheduled}>{goal.startOn}부터 {formatStudySummary(goal.minutes * 60)} 예약</Text>)}
    {reserved && <Text style={styles.caption}>같은 적용일의 예약은 변경할 수 없어요.</Text>}
    {open && !reserved && <>
      <GameInput label="하루 목표 (분)" hint="30~720분 · 10분 단위" value={input} onChangeText={setInput} editable={!disabled && !saving} inputMode="numeric" keyboardType="number-pad" maxLength={4} />
      <View style={styles.row}>
        <GameButton compact label="−10분" accessibilityLabel="목표 10분 줄이기" disabled={disabled || saving || !valid || minutes <= GoalRules.minimum} onPress={() => setInput(String(minutes - GoalRules.step))} />
        <Text style={styles.body}>{valid ? formatStudySummary(minutes * 60) : '입력을 확인해 주세요'}</Text>
        <GameButton compact label="+10분" accessibilityLabel="목표 10분 늘리기" disabled={disabled || saving || !valid || minutes >= GoalRules.maximum} onPress={() => setInput(String(minutes + GoalRules.step))} />
      </View>
      <GameButton label={saving ? '저장 결과 확인 중…' : '내일부터 적용'} disabled={disabled || saving || !valid} onPress={() => onSave(minutes)} />
    </>}
  </GameCard>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  label: { flex: 1, gap: 4 },
  title: { ...GameUi.typography.title, fontSize: 17, color: GameColors.ink },
  body: { ...GameUi.typography.body, color: GameColors.ink },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted },
  scheduled: { ...GameUi.typography.body, color: GameColors.greenDark, fontWeight: '800' },
});
