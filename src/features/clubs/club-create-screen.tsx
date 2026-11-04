import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameButton } from '@/components/ui/game-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GameCard } from '@/components/ui/game-card';
import { GameInput } from '@/components/ui/game-input';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { PartEditor, type DraftPart } from './components/part-editor';
import { useClubCreate } from './hooks/use-club-create';

export function ClubCreateScreen() {
  const create = useClubCreate();
  const [name, setName] = useState(''), [parts, setParts] = useState<DraftPart[]>([{ key: 1, name: '', color: 'GREEN' }]);
  const [myPart, setMyPart] = useState<number | null>(null), [confirmReset, setConfirmReset] = useState(false);
  const sequence = useRef(1), disabled = !!create.operation;
  const input = { name, parts: parts.map(({ name, color }) => ({ name, color })), myPartName: parts.find(part => part.key === myPart)?.name ?? '' };
  async function reset() {
    if (await create.reset()) { setName(''); setParts([{ key: ++sequence.current, name: '', color: 'GREEN' }]); setMyPart(null); setConfirmReset(false); }
  }
  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <ScreenHeader title="동아리 만들기" onBack={() => router.dismissTo('/clubs/join')} backLabel="가입·신청으로 돌아가기" />
          {create.operation && <ActivityIndicator accessibilityLabel={create.operation === 'create' ? '동아리 생성 결과 확인 중' : '동아리 정보 확인 중'} color={GameColors.ink} />}
          {create.error && <Text accessibilityRole="alert" style={styles.error}>{create.error}</Text>}
          {create.status?.kind === 'ready' && <GameCard>
            <Text accessibilityRole="header" style={styles.title}>새 동아리 만들기</Text>
            <GameInput label="동아리 이름" hint="1~20자 · 예: 코딩하는 고양이" value={name} onChangeText={setName} editable={!disabled} autoCorrect={false} />
            <Text accessibilityRole="header" style={styles.title}>소속 파트</Text>
            <Text style={styles.body}>파트를 한 개 이상 만들고 내 소속을 선택해 주세요. 공지 분류는 기본으로 전체공지가 만들어져요.</Text>
            <View style={styles.parts}>
              {parts.map((part, index) => <PartEditor key={part.key} part={part} index={index} disabled={disabled} removable={parts.length > 1}
                onChange={next => setParts(current => current.map(one => one.key === part.key ? next : one))}
                onRemove={() => { setParts(current => current.filter(one => one.key !== part.key)); if (myPart === part.key) setMyPart(null); }} />)}
            </View>
            <GameButton compact variant="secondary" label="+ 파트 추가" disabled={disabled} onPress={() => setParts(current => [...current, { key: ++sequence.current, name: '', color: 'BLUE' }])} />
            <Text style={styles.label}>내 소속 파트</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="내 소속 파트" style={styles.parts}>
              {parts.map((part, index) => <Pressable key={part.key} disabled={disabled} accessibilityRole="radio" accessibilityLabel={`내 소속 파트 ${index + 1}`} accessibilityState={{ checked: myPart === part.key, disabled }} onPress={() => setMyPart(part.key)} style={[styles.select, myPart === part.key && styles.selected]}>
                <Text style={styles.label}>{myPart === part.key ? '●' : '○'} {part.name.trim() || `파트 ${index + 1}`}</Text>
              </Pressable>)}
            </View>
            <Text style={styles.caption}>만든 사람은 선택한 파트의 운영진 부원이 됩니다. 공부·출석·보상 규칙은 모든 사용자에게 같아요.</Text>
            <GameButton label={create.operation === 'create' ? '생성 결과 확인 중…' : '동아리 만들기'} disabled={disabled} onPress={() => { void create.create(input); }} />
          </GameCard>}
          {create.status?.kind === 'created' && <GameCard>
            <Text style={styles.celebration}>NEW CLUB!</Text>
            <Text accessibilityRole="header" style={styles.title}>{create.status.club.name}</Text>
            <Text style={styles.body}>동아리를 확인했어요. 부원 {create.status.club.memberCount}명</Text>
            {create.status.club.inviteCode ? <>
              <Text style={styles.label}>부원에게 알려줄 초대 코드</Text>
              <Text selectable accessibilityLabel={`초대 코드 ${create.status.club.inviteCode}`} style={styles.code}>{create.status.club.inviteCode}</Text>
              <Text style={styles.caption}>코드를 선택하거나 길게 눌러 복사한 뒤 부원에게 공유해 주세요.</Text>
            </> : <Text style={styles.caption}>현재 권한으로는 초대 코드를 확인할 수 없어요.</Text>}
            <GameButton label="동아리 공지로 이동" disabled={disabled} onPress={() => { void create.openClub(); }} />
            <GameButton compact variant="secondary" label="다른 동아리 만들기" disabled={disabled} onPress={() => { void reset(); }} />
          </GameCard>}
          {(create.status?.kind === 'uncertain' || (!create.status && !create.operation && create.error)) && <GameCard>
            <Text accessibilityRole="header" style={styles.title}>생성 결과를 확인해 주세요</Text>
            <Text style={styles.body}>응답을 받지 못했어도 동아리가 만들어졌을 수 있어요. 요청을 자동으로 다시 보내지 않습니다. 가입 목록에서 생성된 동아리를 먼저 확인해 주세요.</Text>
            <GameButton label="가입한 동아리 확인" onPress={() => router.dismissTo('/clubs/join')} />
            {!confirmReset ? <GameButton compact variant="secondary" label="결과 확인 후 새로 작성" disabled={disabled} onPress={() => setConfirmReset(true)} /> : <View style={styles.confirm}>
              <Text accessibilityRole="alert" style={styles.body}>이전 생성 요청은 취소되지 않아요. 새 요청을 보내면 같은 동아리가 다시 만들어질 수 있어요. 가입 목록을 확인했다면 새로 작성해 주세요.</Text>
              <GameButton compact label="확인했어요 · 새로 작성" disabled={disabled} onPress={() => { void reset(); }} />
              <GameButton compact variant="secondary" label="결과 확인 유지" disabled={disabled} onPress={() => setConfirmReset(false)} />
            </View>}
          </GameCard>}
          <GameButton compact variant="secondary" label="생성 상태 다시 확인" disabled={disabled} onPress={() => { void create.refresh(); }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky }, scroll: { flexGrow: 1, paddingVertical: Spacing.four },
  content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.three },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  title: { ...GameUi.typography.title, color: GameColors.ink }, label: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '800' },
  body: { ...GameUi.typography.body, color: GameColors.ink }, caption: { ...GameUi.typography.caption, color: GameColors.inkMuted },
  error: GameUi.errorText, parts: { gap: 12 }, confirm: { gap: 12 },
  select: { minHeight: 48, padding: 10, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12, justifyContent: 'center', backgroundColor: GameColors.paper }, selected: { backgroundColor: GameColors.yellow },
  celebration: { ...GameUi.typography.title, color: GameColors.coral, textAlign: 'center' },
  code: { ...GameUi.typography.number, fontSize: 28, lineHeight: 42, textAlign: 'center', color: GameColors.ink, backgroundColor: GameColors.paper, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: 14, padding: 12 },
});
