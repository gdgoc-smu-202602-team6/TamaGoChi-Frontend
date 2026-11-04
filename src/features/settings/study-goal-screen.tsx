import { Text } from 'react-native';
import { DailyGoalEditor } from '@/features/profile/components/daily-goal-editor';
import { useProfile } from '@/features/profile/hooks/use-profile';
import { SettingsFrame } from './settings-frame';

export function StudyGoalScreen() {
  const profile = useProfile(), data = profile.data;
  return <SettingsFrame title="하루 목표 시간" saving={profile.saving} dirty={false} operation={profile.refreshing ? 'read' : profile.saving ? 'save' : null} error={profile.error} notice={profile.notice} onRefresh={() => { void profile.refresh(); }}>
    {data ? <DailyGoalEditor key={`${data.serviceDay}:${data.scheduledGoals.find(goal => goal.startOn === data.tomorrow)?.minutes ?? '-'}`} profile={data} disabled={profile.refreshing || profile.unverified} saving={profile.saving} onSave={minutes => { void profile.saveGoal(minutes); }} /> : !profile.refreshing && <Text>목표 정보를 확인하지 못했어요.</Text>}
  </SettingsFrame>;
}
