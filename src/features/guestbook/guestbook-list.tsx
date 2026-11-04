import { router, usePreventRemove } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameConfirmDialog } from '@/components/ui/game-confirm-dialog';
import { GameInput } from '@/components/ui/game-input';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { GuestbookRow, GuestbookTarget } from '@/types/guestbook';
import { guestbookLength, guestbookText } from '@/utils/guestbook';
import { noticeDate } from '@/utils/notice';
import { useGuestbook } from './hooks/use-guestbook';

export function GuestbookList({ target, header }: { target: GuestbookTarget; header?: ReactNode }) {
  const state = useGuestbook(target);
  return <GuestbookContent key={state.board ? 'loaded' : 'unavailable'} target={target} header={header} state={state} />;
}
function GuestbookContent({ target, header, state }: { target: GuestbookTarget; header?: ReactNode; state: ReturnType<typeof useGuestbook> }) {
  const [deleting, setDeleting] = useState<GuestbookRow | null>(null), [reset, setReset] = useState(false), [leave, setLeave] = useState(false), [allowLeave, setAllowLeave] = useState(false), leaveAction = useRef<(() => void) | null>(null);
  const writing = ['create', 'delete', 'reset'].includes(state.operation ?? ''), dirty = !!state.draft.trim(), disabled = !!state.operation || !state.verified || !!deleting || reset || leave;
  const stopPrevention = usePreventRemove(!allowLeave && (writing || dirty), ({ repeat }) => { if (!writing) { leaveAction.current = repeat; setLeave(true); } });
  let valid = true; try { guestbookText(state.draft); } catch { valid = false; }
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><FlatList style={styles.list} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" data={state.board?.items ?? []} keyExtractor={entry => entry.id} refreshing={state.operation === 'read'} onRefresh={() => { void state.refresh(); }}
    ListHeaderComponent={<View style={styles.header}>{header}<Text accessibilityRole="header" style={styles.title}>{target.kind === 'mine' ? '내 방명록' : '방명록'}</Text><Text style={styles.body}>{target.kind === 'mine' ? '모든 동아리에서 내 방에 남긴 글이에요.' : '이 동아리에서 남긴 글만 보여요.'}</Text>
      {state.operation && <ActivityIndicator accessibilityLabel="방명록 처리 중" color={GameColors.ink} />}{state.error && <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text>}{state.checkError && <Text accessibilityRole="alert" style={styles.error}>{state.checkError}</Text>}{state.notice && <Text accessibilityLiveRegion="polite" style={styles.body}>{state.notice}</Text>}
      <GameButton compact variant="secondary" label="방명록 다시 확인" disabled={!!state.operation || !!deleting || reset || leave} onPress={() => { void state.refresh(); }} />
      {state.board?.canWrite && <GameCard>
        <GameInput label="방명록 내용" hint={`${guestbookLength(state.draft.trim())} / 60자 · 공백만 입력할 수 없어요.`} value={state.draft} onChangeText={state.setDraft} editable={!disabled && state.board.createStatus === 'ready'} multiline style={styles.input} />
        {state.board.createStatus === 'ready' ? <GameButton label="방명록 남기기" disabled={disabled || !valid} onPress={() => { void state.create(); }} /> : <><Text style={styles.body}>{state.board.createStatus === 'created' ? '이전 등록 응답을 확인했어요. 글이 목록에 있는지 확인해 주세요.' : '이전 요청이 이미 등록됐을 수 있어요. 자동 재전송하지 않으니 목록을 먼저 확인해 주세요.'}</Text><GameButton label="목록 확인 후 새 글 작성" disabled={disabled} onPress={() => setReset(true)} /></>}
      </GameCard>}
      {state.board && <Text style={styles.caption}>불러온 글 {state.board.items.length}개 · 최신 글부터</Text>}
    </View>}
    renderItem={({ item }) => <GameCard style={styles.row} contentStyle={styles.entry}><View style={styles.heading}><Text style={styles.author}>{item.authorName}</Text>{item.new && <Text style={styles.new}>NEW</Text>}<Text style={styles.caption}>{noticeDate(item.createdAt)}</Text></View><Text style={styles.caption}>{item.clubName}</Text><Text selectable style={styles.body}>{item.body}</Text><View style={styles.actions}>{item.authorMemberId && <GameButton compact variant="secondary" label="답방 가기" accessibilityLabel={`${item.authorName} 답방 가기`} disabled={disabled} onPress={() => router.push({ pathname: '/clubs/[clubId]/friends/[memberId]', params: { clubId: item.clubId, memberId: item.authorMemberId! } })} />}{item.canDelete && <GameButton compact variant="secondary" label="삭제" accessibilityLabel={`${item.body} 방명록 삭제`} disabled={disabled} onPress={() => setDeleting(item)} />}</View></GameCard>}
    ListEmptyComponent={!state.operation && !state.error && state.board ? <GameCard><Text style={styles.body}>아직 남겨진 방명록이 없어요.</Text></GameCard> : undefined}
    ListFooterComponent={state.board?.nextPageToken ? <GameButton label="방명록 더 보기" disabled={!!state.operation || !!deleting || reset || leave} onPress={() => { void state.more(); }} /> : undefined}
  /><GameConfirmDialog visible={!!deleting && !!state.board} title="방명록을 삭제할까요?" message={deleting?.body ?? ''} confirmLabel="방명록 삭제 확인" confirmDisabled={!!state.operation || !state.verified} onConfirm={() => { const entry = deleting; setDeleting(null); if (entry) void state.remove(entry); }} onCancel={() => setDeleting(null)} />
  <GameConfirmDialog visible={reset} title="새 글을 작성할까요?" message="먼저 목록에서 이전 요청의 결과를 확인해 주세요. 응답이 유실된 글은 나중에 등록될 수도 있어요. 새 입력란을 열어도 기존 요청은 재전송하지 않아요." confirmLabel="새 입력란 열기" confirmDisabled={!!state.operation || !state.verified} onConfirm={() => { setReset(false); void state.reset(); }} onCancel={() => setReset(false)} />
  <GameConfirmDialog visible={leave} title="작성 화면을 나갈까요?" message="작성 중인 내용은 임시 저장되지 않아요. 미확정 등록 요청의 중복 방지 기록은 유지돼요." confirmLabel="작성 내용 버리고 나가기" onConfirm={() => { setAllowLeave(true); stopPrevention(); setLeave(false); leaveAction.current?.(); }} onCancel={() => { setLeave(false); leaveAction.current = null; }} />
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, list: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center' }, content: { flexGrow: 1, padding: 18, paddingBottom: Spacing.four }, header: { gap: 12, marginBottom: 12 }, title: { ...GameUi.typography.title, color: GameColors.ink }, body: { ...GameUi.typography.body, color: GameColors.ink }, caption: { ...GameUi.typography.caption, color: GameColors.inkMuted }, input: { minHeight: 82, textAlignVertical: 'top' }, row: { marginBottom: 12 }, entry: { backgroundColor: GameColors.paper }, heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, author: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '800' }, new: { ...GameUi.typography.caption, color: GameColors.coral, fontWeight: '900' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, error: { ...GameUi.typography.body, color: GameColors.coral } });
