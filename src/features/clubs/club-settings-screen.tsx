import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameButton } from '@/components/ui/game-button';
import { IconButton } from '@/components/ui/icon-button';
import { GameCard } from '@/components/ui/game-card';
import { GameConfirmDialog } from '@/components/ui/game-confirm-dialog';
import { GameInput } from '@/components/ui/game-input';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { ClubSettings } from '@/types/club-settings';
import { noticeCharacterCount } from '@/utils/notice-compose';
import { useClubSettings } from './hooks/use-club-settings';
import { ClubPartsEntry } from './components/club-parts-entry';
import { ClubMembersEntry } from './components/club-members-entry';

export function ClubSettingsScreen({ clubId }: { clubId: string }) {
  const settings = useClubSettings(clubId);
  return <SettingsContent key={settings.club ? 'loaded' : 'unavailable'} settings={settings} />;
}
function SettingsContent({ settings }: { settings: ReturnType<typeof useClubSettings> }) {
  const [target, setTarget] = useState<ClubSettings | null>(null), club = settings.club;
  const disabled = !!settings.operation || !settings.verified || !!target;
  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.list} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>동아리 기본 설정</Text>{club && <Text style={styles.badge}>운영진</Text>}<View style={styles.spacer} /><IconButton icon="refresh" label="설정 새로고침" disabled={!!settings.operation || !!target} onPress={() => { void settings.refresh(); }} /></View>
        {settings.operation && <ActivityIndicator accessibilityLabel="동아리 설정 확인 중" color={GameColors.ink} />}
        {settings.error && <Text accessibilityRole="alert" style={styles.error}>{settings.error}</Text>}
        {settings.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{settings.notice}</Text>}
        {club && <>
          <ClubPartsEntry key={club.id} clubId={club.id} clubName={club.name} />
          <ClubMembersEntry key={`members:${club.id}`} clubId={club.id} clubName={club.name} />
          <GameCard><Text accessibilityRole="header" style={styles.title}>{club.name}</Text><Text style={styles.caption}>부원 {club.memberCount}명</Text>
            <View style={styles.codePanel}><Text style={styles.label}>초대 코드</Text><Text selectable accessibilityLabel={`초대 코드 ${club.inviteCode}`} style={styles.code}>{club.inviteCode}</Text>
              <View style={styles.buttons}><GameButton compact label="초대 코드 복사" disabled={disabled} onPress={() => { void settings.copy(); }} /><GameButton compact variant="secondary" label="초대 코드 재발급" disabled={disabled} onPress={() => setTarget(club)} /></View>
              <Text style={styles.caption}>코드를 선택하거나 길게 눌러 복사할 수도 있어요. 재발급하면 이전 코드는 즉시 사용할 수 없어요.</Text>
            </View>
          </GameCard>
          <GameCard><GameInput label="동아리 이름" hint={`${noticeCharacterCount(settings.name) ?? '—'}/20자`} value={settings.name} editable={!disabled} onChangeText={settings.changeName} />
            <GameButton label="동아리 이름 저장" disabled={disabled} onPress={() => { void settings.saveName(); }} />
            <GameButton compact variant="secondary" label="현재 이름으로 되돌리기" disabled={disabled} onPress={settings.resetName} />
          </GameCard>
        </>}
        <GameButton variant="secondary" label="공지 목록으로" disabled={!!settings.operation || !!target} onPress={() => { void settings.openList(); }} />
      </ScrollView>
    </KeyboardAvoidingView>
    <GameConfirmDialog visible={!!target && !!club} title="초대 코드를 재발급할까요?" message={`${target?.name ?? ''}\n\n새 코드가 만들어지면 이전 코드는 즉시 사용할 수 없어요. 부원에게 새 코드를 공유해 주세요.`} confirmLabel="재발급 확인" confirmDisabled={!!settings.operation || !settings.verified} onConfirm={() => { const expected = target; setTarget(null); if (expected) void settings.mutate({ kind: 'rotate', expected }); }} onCancel={() => setTarget(null)} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky }, list: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center' }, content: { flexGrow: 1, padding: 18, paddingBottom: Spacing.four, gap: Spacing.three },
  heading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }, spacer: { flex: 1 }, title: { ...GameUi.typography.title, color: GameColors.ink }, badge: { ...GameUi.typography.caption, backgroundColor: GameColors.coral, color: GameColors.paper, padding: 8, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12 },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted }, label: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '800' }, error: GameUi.errorText, notice: { ...GameUi.typography.body, color: GameColors.ink, backgroundColor: GameColors.cream, borderRadius: 12, padding: 12 },
  codePanel: { backgroundColor: GameColors.cream, borderWidth: 2, borderStyle: 'dashed', borderColor: GameColors.inkMuted, borderRadius: 16, padding: 16, gap: 12 }, code: { ...GameUi.typography.number, color: GameColors.ink, fontSize: 28, lineHeight: 38 }, buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
