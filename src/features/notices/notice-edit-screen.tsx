import { router, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameButton } from '@/components/ui/game-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GameCard } from '@/components/ui/game-card';
import { GameConfirmDialog } from '@/components/ui/game-confirm-dialog';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { PublishedNotice } from '@/types/notice-compose';
import { notificationLabels } from '@/utils/notice-compose';
import { NoticeFields } from './components/notice-fields';
import { useNoticeEditor } from './hooks/use-notice-editor';

export function NoticeEditScreen({ clubId, noticeId }: { clubId: string; noticeId: string }) {
  const editor = useNoticeEditor(clubId, noticeId);
  // Losing access also discards any confirmation holding a previous notice's content.
  return <NoticeEditContent key={editor.snapshot ? 'loaded' : 'unavailable'} editor={editor} />;
}
function NoticeEditContent({ editor }: { editor: ReturnType<typeof useNoticeEditor> }) {
  const snapshot = editor.snapshot;
  const [allowLeave, setAllowLeave] = useState(false), [leavePrompt, setLeavePrompt] = useState(false), [reloadPrompt, setReloadPrompt] = useState(false), [deleteTarget, setDeleteTarget] = useState<PublishedNotice | null>(null);
  const leaveAction = useRef<(() => void) | null>(null), mutating = editor.operation === 'save' || editor.operation === 'delete';
  const prevent = !allowLeave && (editor.dirty || mutating), modal = leavePrompt || reloadPrompt || !!deleteTarget;
  const disablePrevention = usePreventRemove(prevent, ({ repeat }) => { if (!mutating) { leaveAction.current = repeat; setLeavePrompt(true); } });
  const disabled = !!editor.operation || !editor.verified || !!editor.blocked || modal;
  function leave(action: () => void) { if (editor.operation) return; if (prevent) { leaveAction.current = action; setLeavePrompt(true); } else action(); }
  function confirmLeave() { setAllowLeave(true); disablePrevention(); setLeavePrompt(false); leaveAction.current?.(); }
  return <SafeAreaView style={styles.screen}><ScreenHeader title="공지 수정" onBack={() => leave(() => router.dismissTo('/notice'))} backDisabled={!!editor.operation || modal} backLabel="공지로 돌아가기" actions={snapshot && <GameButton compact label={editor.operation === 'save' ? '저장 중…' : '저장'} accessibilityLabel="공지 수정 저장" disabled={disabled || !editor.dirty} onPress={() => { void editor.save(); }} />} />
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}><View style={styles.content}>
        {snapshot && <Text style={styles.body}>{snapshot.board.club.name}</Text>}
        {editor.operation && <ActivityIndicator color={GameColors.ink} accessibilityLabel="공지 관리 처리 중" />}
        {editor.error && <Text accessibilityRole="alert" style={styles.error}>{editor.error}</Text>}
        {editor.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{editor.notice}</Text>}
        {!editor.removed && <GameButton compact variant="secondary" label="수정 상태 다시 확인" disabled={!!editor.operation || modal} onPress={() => { void editor.refresh(); }} />}
        {editor.blocked && <GameCard><Text style={styles.body}>{editor.blocked === 'changed' ? '현재 서버 내용을 확인한 뒤 다시 편집해 주세요.' : '결과를 확인할 때까지 저장·삭제를 기다려 주세요. 상태 확인은 요청을 반복하지 않아요.'}</Text>
          <GameButton label="서버 내용 다시 불러오기" disabled={!!editor.operation || modal} onPress={() => { if (editor.dirty) setReloadPrompt(true); else void editor.refresh(true); }} />
        </GameCard>}
        {snapshot && <>
          <Text style={styles.caption}>수정해도 알림은 다시 보내지 않아요. {notificationLabels[snapshot.board.notice.notificationState]}</Text>
          <GameCard contentStyle={styles.form}><NoticeFields draft={snapshot.draft} categories={snapshot.board.categories} disabled={disabled} label="공지 수정" onChange={editor.change} /></GameCard>
          <GameButton variant="secondary" label="공지 삭제" disabled={disabled} onPress={() => setDeleteTarget(snapshot.board.notice)} />
        </>}
        {editor.removed && <GameCard><Text accessibilityRole="header" style={styles.result}>{editor.removed === 'deleted' ? '공지를 삭제했어요.' : '공지를 더 이상 조회할 수 없어요.'}</Text>
          <Text style={styles.body}>{editor.removed === 'deleted' ? '목록에서 현재 공지를 확인할 수 있어요.' : '삭제되었거나 접근 상태가 바뀌었을 수 있어요. 목록에서 확인해 주세요.'}</Text>
        </GameCard>}
        <GameButton variant="secondary" label="공지 목록으로" disabled={!!editor.operation || modal} onPress={() => leave(() => { void editor.openList(); })} />
      </View></ScrollView>
    </KeyboardAvoidingView>
    <GameConfirmDialog visible={leavePrompt && !!snapshot} title="수정 화면을 나갈까요?" message="저장하지 않은 수정 내용은 사라져요. 처리 결과가 불확실하면 목록에서 현재 내용을 확인해 주세요." confirmLabel="저장하지 않고 나가기" onConfirm={confirmLeave} onCancel={() => setLeavePrompt(false)} />
    <GameConfirmDialog visible={reloadPrompt && !!snapshot} title="서버 내용으로 바꿀까요?" message="작성 중인 수정 내용을 버리고 현재 서버 공지를 다시 불러와요." confirmLabel="서버 내용 불러오기" onConfirm={() => { setReloadPrompt(false); void editor.refresh(true); }} onCancel={() => setReloadPrompt(false)} />
    <GameConfirmDialog visible={!!deleteTarget && !!snapshot} title="공지를 삭제할까요?" message={`${deleteTarget?.title ?? ''}\n\n${editor.dirty ? '작성 중인 수정은 저장하지 않고 이 공지를 삭제해요. ' : ''}삭제한 공지는 복구할 수 없어요.`} confirmLabel="삭제 확인" onConfirm={() => { const target = deleteTarget; setDeleteTarget(null); if (target) void editor.remove(target); }} onCancel={() => setDeleteTarget(null)} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky }, scroll: { flexGrow: 1, paddingVertical: Spacing.three }, content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.three },
  topbar: { paddingVertical: 12 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { ...GameUi.typography.title, color: GameColors.ink, flex: 1 }, result: { ...GameUi.typography.title, color: GameColors.ink },
  body: { ...GameUi.typography.body, color: GameColors.ink }, caption: { ...GameUi.typography.caption, color: GameColors.inkMuted }, error: GameUi.errorText,
  notice: { ...GameUi.typography.body, color: GameColors.ink, backgroundColor: GameColors.cream, padding: 12, borderRadius: 12 }, form: { backgroundColor: GameColors.cream },
});
