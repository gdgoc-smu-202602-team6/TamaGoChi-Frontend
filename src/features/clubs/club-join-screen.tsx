import { router } from 'expo-router';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameInput } from '@/components/ui/game-input';
import { Palette } from '@/constants/palette';
import { isMockMode } from '@/constants/api';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { ClubApplication } from '@/types/club-join';
import type { JoinedClub } from '@/types/notice';
import { validInviteCode } from '@/utils/club-join';
import { ApplicationCard } from './components/application-card';
import { useClubJoin } from './hooks/use-club-join';

type Row = { kind: 'club'; club: JoinedClub } | { kind: 'application'; application: ClubApplication };
export function ClubJoinScreen() {
  const join = useClubJoin();
  const disabled = !!join.operation || join.refreshing || join.unverified;
  const joinedPreview = join.data?.clubs.some(club => club.id === join.preview?.id);
  const pendingPreview = join.data?.applications.some(one => one.clubId === join.preview?.id && one.state === 'PENDING');
  const rows: Row[] = [...(join.data?.applications.map(application => ({ kind: 'application' as const, application })) ?? []), ...(join.data?.clubs.map(club => ({ kind: 'club' as const, club })) ?? [])];
  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList<Row> style={styles.list} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
        data={rows} keyExtractor={row => row.kind === 'club' ? `club:${row.club.id}` : `application:${row.application.id}`}
        refreshing={join.refreshing} onRefresh={() => { void join.refresh(); }}
        ListHeaderComponent={<View style={styles.header}>
          <View style={styles.heading}><GameButton compact variant="secondary" label="◀ 내 방" onPress={() => router.dismissTo('/')} /><Text accessibilityRole="header" style={styles.title}>동아리 가입</Text></View>
          <GameCard>
            <Text accessibilityRole="header" style={styles.cardTitle}>초대 코드 입력</Text>
            <GameInput label="초대 코드" hint="운영진에게 받은 영문 대문자·숫자 8자리를 입력해 주세요." value={join.code} onChangeText={join.changeCode} autoCapitalize="characters" autoCorrect={false} maxLength={32} editable={!join.operation} returnKeyType="search" onSubmitEditing={() => { if (validInviteCode(join.code)) void join.search(); }} />
            <GameButton label={join.operation === 'search' ? '동아리 찾는 중…' : '동아리 찾기'} disabled={!!join.operation || !validInviteCode(join.code)} onPress={() => { void join.search(); }} />
            {isMockMode && <Text style={styles.caption}>미리보기 초대 코드: MORI2026</Text>}
          </GameCard>
          {join.error && <Text accessibilityRole="alert" style={styles.error}>{join.error}</Text>}
          {join.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{join.notice}</Text>}
          {join.preview && <GameCard contentStyle={styles.preview}>
            <Text accessibilityRole="header" style={styles.cardTitle}>{join.preview.name}</Text>
            <Text style={styles.body}>부원 {join.preview.memberCount}명 · 운영진 승인 후 가입</Text>
            {joinedPreview ? <><Text style={styles.body}>이미 가입한 동아리예요.</Text><GameButton label="동아리 공지 보기" disabled={disabled} onPress={() => { void join.openClub(join.preview!.id); }} /></>
              : pendingPreview ? <Text style={styles.body}>이미 승인 대기 중이에요. 아래 신청 내역에서 확인해 주세요.</Text> : <>
                <Text style={styles.label}>소속 파트 선택</Text>
                <View style={styles.parts} accessibilityRole="radiogroup" accessibilityLabel="소속 파트">
                  {join.preview.parts.map(part => <Pressable key={part.id} accessibilityRole="radio" accessibilityLabel={`파트 ${part.name}`} accessibilityState={{ checked: part.id === join.partId, disabled }} disabled={disabled} onPress={() => join.setPartId(part.id)} style={[styles.part, { backgroundColor: part.id === join.partId ? GameColors.yellow : Palette[part.color].background }]}><Text style={[styles.partText, { color: part.id === join.partId ? GameColors.ink : Palette[part.color].text }]}>{part.name}</Text></Pressable>)}
                </View>
                {!join.preview.parts.length && <Text style={styles.caption}>선택할 파트가 없어요. 운영진에게 확인해 주세요.</Text>}
                <GameButton label={join.operation === 'apply' ? '신청 결과 확인 중…' : '가입 신청 보내기'} disabled={disabled || !join.partId} onPress={() => { void join.apply(); }} />
              </>}
          </GameCard>}
          <GameButton compact variant="secondary" label="가입·신청 상태 다시 확인" disabled={!!join.operation || join.refreshing} onPress={() => { void join.refresh(); }} />
          {join.refreshing && <ActivityIndicator accessibilityLabel="가입 신청 정보 불러오는 중" color={GameColors.ink} />}
          {join.loadError && <Text accessibilityRole="alert" style={styles.error}>{join.loadError}</Text>}
          <Text style={styles.caption}>승인 전에도 개인 공부·내 방·상점은 이용할 수 있어요. 동아리 공지는 가입이 확인된 뒤 열 수 있어요.</Text>
        </View>}
        renderItem={({ item, index }) => <View style={styles.item}>
          {item.kind === 'club' && (index === 0 || rows[index - 1].kind !== 'club') && <Text accessibilityRole="header" style={styles.sectionTitle}>가입한 동아리</Text>}
          {item.kind === 'application' && (index === 0 || rows[index - 1].kind !== 'application') && <Text accessibilityRole="header" style={styles.sectionTitle}>내 신청 내역</Text>}
          {item.kind === 'club' ? <GameCard contentStyle={styles.preview}><Text style={styles.cardTitle}>{item.club.name}</Text><Text style={styles.caption}>부원 {item.club.memberCount}명</Text><GameButton compact label="공지 보기" accessibilityLabel={`${item.club.name} 공지 보기`} disabled={disabled} onPress={() => { void join.openClub(item.club.id); }} /></GameCard>
            : <ApplicationCard application={item.application} disabled={disabled} onCancel={() => { void join.cancel(item.application); }} onOpen={join.data?.clubs.some(club => club.id === item.application.clubId) ? () => { void join.openClub(item.application.clubId); } : undefined} />}
        </View>}
        ListEmptyComponent={!join.refreshing && !join.loadError ? <GameCard><Text style={styles.body}>아직 가입한 동아리나 신청 내역이 없어요. 초대 코드로 동아리를 찾아보세요.</Text></GameCard> : undefined}
      />
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky }, list: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center' },
  content: { flexGrow: 1, padding: 18, paddingBottom: Spacing.four }, header: { gap: Spacing.three, marginBottom: Spacing.three },
  heading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }, title: { ...GameUi.typography.title, color: GameColors.ink },
  cardTitle: { ...GameUi.typography.title, color: GameColors.ink }, body: { ...GameUi.typography.body, color: GameColors.ink },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted }, label: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '800' },
  error: { ...GameUi.typography.body, color: GameColors.coral }, notice: { ...GameUi.typography.body, fontWeight: '800', color: GameColors.ink, backgroundColor: GameColors.cream, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12, padding: 12 },
  preview: { backgroundColor: GameColors.paper }, parts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  part: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: 13 },
  partText: { ...GameUi.typography.body, fontWeight: '800' }, sectionTitle: { ...GameUi.typography.title, color: GameColors.ink, marginBottom: 10 }, item: { marginBottom: Spacing.three },
});
