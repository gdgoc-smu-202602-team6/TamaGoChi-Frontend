import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SettingsRow, SettingsSection } from '@/components/ui/settings-section';
import { GameColors, GameUi } from '@/constants/theme';
import { useClubs } from '@/state/club-context';
import { useAuth } from '@/state/auth-context';

export function SettingsScreen() {
  const clubs = useClubs(), { state } = useAuth();
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader title="설정" onBack={() => router.dismissTo('/mypage')} backLabel="마이로 돌아가기" />
    <SettingsSection title="내 계정">
      <SettingsRow title="닉네임" value={state.user?.nickname} icon="person" onPress={() => router.push('/settings/profile')} />
      <SettingsRow title="계정 관리" icon="lock" onPress={() => router.push('/account')} />
    </SettingsSection>
    <SettingsSection title="공부">
      <SettingsRow title="하루 목표 시간" icon="clock" onPress={() => router.push('/settings/study-goal')} />
      <SettingsRow title="앱 차단 안내" icon="lock" onPress={() => router.push('/app-blocking')} />
    </SettingsSection>
    <SettingsSection title="내 방">
      <SettingsRow title="보유 아이템 · 방 꾸미기" icon="home" onPress={() => router.push('/room-edit')} />
      <SettingsRow title="방명록" icon="book" onPress={() => router.push('/guestbook')} />
    </SettingsSection>
    <SettingsSection title="동아리">
      {clubs.status === 'ready' && clubs.clubs.map(club => <SettingsRow key={club.id} title={club.name} icon="group" accessibilityLabel={`${club.name} 동아리 설정`} onPress={() => router.push({ pathname: '/clubs/[clubId]/manage', params: { clubId: club.id } })} />)}
      <SettingsRow title="동아리 가입·신청" icon="plus" onPress={() => router.push('/clubs/join')} />
    </SettingsSection>
    {clubs.status === 'loading' && <ActivityIndicator color={GameColors.accent} accessibilityLabel="동아리 설정 확인 중" />}
    {clubs.error && <><Text accessibilityRole="alert" style={styles.error}>{clubs.error}</Text><SettingsRow title="동아리 다시 확인" icon="refresh" onPress={() => { void clubs.refresh(); }} /></>}
  </ScrollView></SafeAreaView>;
}
export const settingsStyles = StyleSheet.create({ screen: { flex: 1, backgroundColor: GameColors.sky }, content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', padding: 18, paddingBottom: 36, gap: 26 }, error: { ...GameUi.typography.body, color: GameColors.coral } });
const styles = settingsStyles;
