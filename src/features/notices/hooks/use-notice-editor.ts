import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, apiErrorMessage } from '@/services/api/http-client';
import { useClubs } from '@/state/club-context';
import { useGameServices } from '@/state/game-services';
import { useNoticeUnread } from '@/state/notice-unread-context';
import { ClubAdminError } from '@/types/club-admin';
import { NoticeComposeError } from '@/types/notice-compose';
import type { PublishedNotice } from '@/types/notice-compose';
import { NoticeManagementError, type NoticeEditBoard, type NoticeEditInput, type NoticeRemoval } from '@/types/notice-management';
import { validateNoticeCreate } from '@/utils/notice-compose';
import { normalizeNoticeEdit, noticeEditFields, sameNoticeContent } from '@/utils/notice-edit';

type Snapshot = { board: NoticeEditBoard; draft: NoticeEditInput };
function accessLost(error: unknown) {
  return (error instanceof ClubAdminError && ['forbidden', 'not-found'].includes(error.reason)) || (error instanceof NoticeManagementError && error.reason === 'forbidden')
    || (error instanceof ApiError && [401, 403, 404].includes(error.status ?? 0));
}
function message(error: unknown) {
  if (accessLost(error)) return '이 공지를 관리할 권한이 없거나 동아리 접근 상태가 바뀌었어요.';
  if (error instanceof NoticeManagementError) {
    if (error.reason === 'missing') return '공지를 더 이상 확인할 수 없어요. 목록에서 현재 상태를 확인해 주세요.';
    if (error.reason === 'changed') return '다른 운영진이 공지를 바꿨어요. 서버 내용을 다시 불러온 뒤 확인해 주세요.';
    return '처리 결과를 확인하지 못했어요. 상태 다시 확인은 조회만 합니다.';
  }
  if (error instanceof NoticeComposeError) return error.reason === 'category-changed' ? '분류가 바뀌었어요. 현재 분류와 세부 분류를 다시 선택해 주세요.' : error.reason === 'storage' ? '저장된 공지 정보를 읽지 못했어요. 상태를 다시 확인해 주세요.' : '제목·내용과 분류를 확인해 주세요.';
  return apiErrorMessage(error);
}
export function useNoticeEditor(clubId: string, noticeId: string) {
  const { noticeManagement: service } = useGameServices(), clubs = useClubs(), { invalidateClub, refreshClub } = useNoticeUnread();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), current = useRef<Snapshot | null>(null);
  const [operation, setOperation] = useState<'check' | 'save' | 'delete' | 'reload' | 'open' | null>('check');
  const [blocked, setBlocked] = useState<'changed' | 'uncertain' | null>(null), [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null), [removed, setRemoved] = useState<NoticeRemoval | null>(null);
  const alive = useRef(true), busy = useRef(false), canWrite = useRef(false), intent = useRef<{ kind: 'save'; draft: NoticeEditInput } | { kind: 'delete' } | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const update = useCallback((next: Snapshot | null) => { current.current = next; setSnapshot(next); }, []);
  const apply = useCallback((board: NoticeEditBoard) => { update({ board, draft: noticeEditFields(board.notice) }); intent.current = null; setBlocked(null); setVerified(true); canWrite.current = true; setRemoved(null); }, [update]);
  const clear = useCallback(() => { update(null); intent.current = null; setVerified(false); canWrite.current = false; setBlocked(null); }, [update]);
  const reconcile = useCallback((board: NoticeEditBoard, adopt: boolean) => {
    const previous = current.current, pending = intent.current;
    if (!previous || adopt) { apply(board); return; }
    if (pending?.kind === 'save' && sameNoticeContent(board.notice, pending.draft)) { apply(board); setNotice('입력한 수정 내용이 현재 서버 상태와 같아요.'); return; }
    const changed = !sameNoticeContent(previous.board.notice, board.notice), dirty = !sameNoticeContent(previous.draft, previous.board.notice);
    if (!dirty && !pending) { apply(board); return; }
    update({ ...previous, board: { ...board, notice: changed ? { ...previous.board.notice, notificationState: board.notice.notificationState, read: board.notice.read } : board.notice } });
    const block = changed ? 'changed' : pending ? 'uncertain' : null;
    setBlocked(block); setVerified(!block); canWrite.current = !block;
    if (block) setError(message(new NoticeManagementError(block)));
  }, [apply, update]);
  const refresh = useCallback(async (adopt = false) => {
    if (busy.current || removed) return;
    busy.current = true; canWrite.current = false; setVerified(false); setOperation(adopt ? 'reload' : 'check'); setError(null); setNotice(null);
    try { const board = await service.getBoard(clubId, noticeId); if (alive.current) reconcile(board, adopt); }
    catch (reason) {
      if (alive.current) {
        if (reason instanceof NoticeManagementError && reason.reason === 'missing' && intent.current?.kind === 'delete') { clear(); setRemoved('absent'); }
        else { if (accessLost(reason) || reason instanceof NoticeManagementError && reason.reason === 'missing') clear(); setError(message(reason)); }
      }
    } finally { invalidateClub(clubId); void refreshClub(clubId); busy.current = false; if (alive.current) setOperation(null); }
  }, [service, clubId, noticeId, reconcile, clear, removed, refreshClub, invalidateClub]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => subscription.remove();
  }, [refresh]));
  function change(value: Partial<NoticeEditInput>) { const one = current.current; if (!one || busy.current || !canWrite.current) return; update({ ...one, draft: { ...one.draft, ...value } }); setError(null); setNotice(null); }
  async function mutate(kind: 'save' | 'delete', deleteTarget?: PublishedNotice) {
    const one = current.current;
    if (!one || busy.current || !canWrite.current) return;
    if (kind === 'save') { const invalid = validateNoticeCreate({ ...one.draft, notify: false }); if (invalid) { setError(invalid); return; } }
    busy.current = true; canWrite.current = false; setOperation(kind); setError(null); setNotice(null);
    invalidateClub(clubId);
    intent.current = kind === 'save' ? { kind, draft: normalizeNoticeEdit(one.draft) } : { kind };
    try {
      if (kind === 'save') { const receipt = await service.save(clubId, noticeId, one.board.notice, one.draft); if (alive.current) { apply({ ...one.board, notice: receipt }); setNotice('수정 내용이 서버에서 확인됐어요. 알림은 다시 보내지 않아요.'); } }
      else { const result = await service.remove(clubId, noticeId, deleteTarget ?? one.board.notice); if (alive.current) { clear(); setRemoved(result); } }
    } catch (reason) {
      if (!alive.current) return;
      if (accessLost(reason) || reason instanceof NoticeManagementError && reason.reason === 'missing') clear();
      else if (reason instanceof NoticeManagementError) { setBlocked(reason.reason === 'changed' ? 'changed' : 'uncertain'); setVerified(false); }
      else {
        intent.current = null;
        if (reason instanceof NoticeComposeError && reason.reason === 'category-changed') {
          try { const board = await service.getBoard(clubId, noticeId); if (alive.current) reconcile(board, false); } catch (readError) { if (alive.current && (accessLost(readError) || readError instanceof NoticeManagementError && readError.reason === 'missing')) clear(); }
        } else if (reason instanceof ApiError && [400, 422].includes(reason.status ?? 0)) { setVerified(true); canWrite.current = true; }
        else setVerified(false);
      }
      if (alive.current) setError(message(reason));
    } finally { invalidateClub(clubId); void refreshClub(clubId); busy.current = false; if (alive.current) setOperation(null); }
  }
  async function openList() {
    if (busy.current) return;
    busy.current = true; setOperation('open'); setError(null);
    try {
      await clubs.refresh(); if (!alive.current) return;
      const selected = await clubs.selectClub(clubId);
      if (alive.current) { if (selected) router.dismissTo('/notice'); else setError('현재 동아리 소속과 선택을 확인하지 못했어요. 동아리 목록에서 확인해 주세요.'); }
    }
    catch (reason) { if (alive.current) setError(message(reason)); }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  return { snapshot, operation, blocked, verified, error, notice, removed, dirty: !!snapshot && !sameNoticeContent(snapshot.draft, snapshot.board.notice), change, refresh, save: () => mutate('save'), remove: (original: PublishedNotice) => mutate('delete', original), openList };
}
