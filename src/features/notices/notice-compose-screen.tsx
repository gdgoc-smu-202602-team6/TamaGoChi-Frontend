import { router, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameButton } from '@/components/ui/game-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { IconButton } from '@/components/ui/icon-button';
import { GameCard } from '@/components/ui/game-card';
import { GameToggle } from '@/components/ui/game-toggle';
import { isMockMode } from '@/constants/api';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { notificationLabels } from '@/utils/notice-compose';
import { NoticeFields } from './components/notice-fields';
import { useNoticeCompose } from './hooks/use-notice-compose';

export function NoticeComposeScreen({ clubId }: { clubId: string }) {
  const editor = useNoticeCompose(clubId), board = editor.board, draft = editor.draft;
  const [allowLeave, setAllowLeave] = useState(false), [leavePrompt, setLeavePrompt] = useState(false), [resetPrompt, setResetPrompt] = useState(false);
  const leaveAction = useRef<(() => void) | null>(null);
  const publishing = editor.operation === 'publish', prevent = !allowLeave && (editor.dirty || publishing);
  const disablePrevention = usePreventRemove(prevent, ({ repeat }) => { if (!publishing) { leaveAction.current = repeat; setLeavePrompt(true); } });
  const disabled = !!editor.operation || !editor.verified || leavePrompt || resetPrompt;
  function leave(action: () => void) {
    if (editor.operation) return;
    if (prevent) { leaveAction.current = action; setLeavePrompt(true); }
    else action();
  }
  function confirmLeave() { setAllowLeave(true); disablePrevention(); setLeavePrompt(false); leaveAction.current?.(); }
  return <SafeAreaView style={styles.screen}><ScreenHeader title="공지 쓰기" onBack={() => leave(() => router.dismissTo('/notice'))} backDisabled={!!editor.operation} backLabel="공지로 돌아가기" actions={<><IconButton icon="refresh" label="작성 상태 새로고침" disabled={!!editor.operation || leavePrompt || resetPrompt} onPress={() => { void editor.refresh(); }} />{board && board.status.kind === 'ready' && <GameButton compact label={publishing ? '등록 중…' : '공지 올리기'} disabled={disabled || !board.categories.length} onPress={() => { void editor.publish(); }} />}</>} />
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          {board && <Text style={styles.body}>{board.club.name}</Text>}
          {editor.operation && <ActivityIndicator color={GameColors.ink} accessibilityLabel={publishing ? '공지 등록 중' : '공지 작성 상태 확인 중'} />}
          {editor.error && <Text accessibilityRole="alert" style={styles.error}>{editor.error}</Text>}
          {leavePrompt && <GameCard>
            <Text style={styles.body}>{board?.status.kind === 'uncertain' ? '공지가 이미 등록됐을 수 있어요. 작성 화면을 나가 공지 목록을 확인할까요?' : '작성 중인 내용은 임시 저장되지 않아요. 저장하지 않고 화면을 나갈까요?'}</Text>
            <GameButton label="계속 작성·확인하기" onPress={() => { setLeavePrompt(false); leaveAction.current = null; }} />
            <GameButton variant="secondary" label="화면 나가기" onPress={confirmLeave} />
          </GameCard>}
          {board && board.status.kind === 'ready' && <GameCard contentStyle={styles.form}>
            <NoticeFields draft={draft} categories={board.categories} disabled={disabled} label="공지 작성" onChange={editor.change}>
              <GameToggle label="푸시 알림 보내기" hint="등록 후 서버에 알림 발송을 요청해요." value={draft.notify} disabled={disabled} onChange={notify => editor.change({ notify })} />
            </NoticeFields>
          </GameCard>}
          {board && board.status.kind === 'created' && <GameCard>
            <Text accessibilityRole="header" style={styles.title}>공지 등록 확인</Text>
            <Text style={styles.label}>{board.status.notice.title}</Text><Text selectable style={styles.body}>{board.status.notice.body}</Text>
            <Text accessibilityLiveRegion="polite" style={styles.body}>{notificationLabels[board.status.notice.notificationState]}</Text>
            <GameButton label="공지 목록으로" disabled={disabled} onPress={() => leave(() => { void editor.openList(); })} />
            <GameButton variant="secondary" label="새 공지 작성" disabled={disabled} onPress={() => { void editor.reset(); }} />
          </GameCard>}
          {board && board.status.kind === 'uncertain' && <GameCard>
            <Text accessibilityRole="header" style={styles.title}>등록 결과를 확인해 주세요</Text>
            <Text style={styles.body}>공지나 알림이 이미 등록됐을 수 있어요. 요청을 다시 보내지 않으니 공지 목록에서 먼저 확인해 주세요.</Text>
            <GameButton label="공지 목록 확인" disabled={!!editor.operation || leavePrompt || resetPrompt} onPress={() => leave(() => { void editor.openList(); })} />
            <GameButton variant="secondary" label="목록 확인 후 새로 작성" disabled={disabled} onPress={() => { setResetPrompt(true); }} />
          </GameCard>}
          {resetPrompt && <GameCard>
            <Text style={styles.body}>이전 요청은 취소되지 않아요. 목록 확인 없이 새로 등록하면 같은 공지와 알림이 중복될 수 있어요. 확인 후 새로 작성할까요?</Text>
            <GameButton label="확인했어요 · 새로 작성" disabled={!!editor.operation} onPress={() => { void editor.reset().then(reset => { if (reset) setResetPrompt(false); }); }} />
            <GameButton variant="secondary" label="돌아가기" disabled={!!editor.operation} onPress={() => setResetPrompt(false)} />
          </GameCard>}
          {isMockMode && <Text style={styles.caption}>미리보기 모드 · 공지와 요청 기록은 이 브라우저에 저장해요. 실제 푸시는 보내지 않아요.</Text>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky }, scroll: { flexGrow: 1, paddingVertical: Spacing.three },
  content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.three },
  topbar: { paddingVertical: 12 }, heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, headingTitle: { flex: 1 }, title: { ...GameUi.typography.title, color: GameColors.ink },
  body: { ...GameUi.typography.body, color: GameColors.ink }, label: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '800' },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted }, error: GameUi.errorText,
  form: { backgroundColor: GameColors.cream, gap: Spacing.three },
});
