import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError, apiErrorMessage } from '@/services/api/http-client';
import { useClubs } from '@/state/club-context';
import { useGameServices } from '@/state/game-services';
import { ClubAdminError } from '@/types/club-admin';
import { NoticeComposeError, type NoticeComposeBoard, type NoticeCreateInput } from '@/types/notice-compose';
import { validateNoticeCreate } from '@/utils/notice-compose';

const emptyDraft = (): NoticeCreateInput => ({ categoryId: '', title: '', body: '', pinned: false, notify: false });
function accessLost(error: unknown) {
  return (error instanceof ApiError && [401, 403, 404].includes(error.status ?? 0))
    || ((error instanceof NoticeComposeError || error instanceof ClubAdminError) && ['forbidden', 'not-found'].includes(error.reason));
}
function errorText(error: unknown) {
  if (accessLost(error)) return '이 동아리에 공지를 작성할 권한이 없거나 접근 상태가 바뀌었어요.';
  if (!(error instanceof NoticeComposeError)) return apiErrorMessage(error);
  if (error.reason === 'storage') return '등록 요청 기록을 읽거나 저장하지 못했어요. 상태를 다시 확인해 주세요.';
  if (error.reason === 'category-changed') return '분류 또는 세부 분류가 바뀌었어요. 현재 분류를 다시 선택해 주세요.';
  if (error.reason === 'uncertain') return '등록 결과가 확실하지 않아요. 공지 목록에서 먼저 확인해 주세요.';
  if (error.reason === 'already-created') return '이미 등록된 공지가 있어요. 등록 결과를 확인해 주세요.';
  return '제목·내용과 분류를 확인해 주세요.';
}
export function useNoticeCompose(clubId: string) {
  const { noticeCompose: service } = useGameServices(), clubs = useClubs();
  const [board, setBoard] = useState<NoticeComposeBoard | null>(null), [draft, setDraft] = useState(emptyDraft);
  const [operation, setOperation] = useState<'check' | 'publish' | 'reset' | 'open' | null>('check');
  const [error, setError] = useState<string | null>(null), [dirty, setDirty] = useState(false), [verified, setVerified] = useState(false);
  const alive = useRef(true), busy = useRef(false), initialized = useRef(false), canWrite = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const applyBoard = useCallback((next: NoticeComposeBoard) => {
    setBoard(next); setVerified(true); canWrite.current = next.status.kind === 'ready';
    if (!initialized.current) { setDraft({ ...emptyDraft(), categoryId: next.categories[0]?.id ?? '' }); initialized.current = true; }
  }, []);
  const clearAccess = useCallback(() => {
    setBoard(null); setDraft(emptyDraft()); setDirty(false); initialized.current = false; canWrite.current = false; setVerified(false);
  }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; canWrite.current = false; setOperation('check'); setError(null); setVerified(false);
    try { const next = await service.getBoard(clubId); if (alive.current) applyBoard(next); }
    catch (reason) { if (alive.current) { if (accessLost(reason)) clearAccess(); setError(errorText(reason)); } }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }, [service, clubId, applyBoard, clearAccess]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => subscription.remove();
  }, [refresh]));
  function change(next: Partial<NoticeCreateInput>) {
    if (busy.current || !canWrite.current) return;
    setDraft(previous => ({ ...previous, ...next })); setDirty(true); setError(null);
  }
  async function publish() {
    if (busy.current || !canWrite.current || board?.status.kind !== 'ready') return;
    const invalid = validateNoticeCreate(draft);
    if (invalid) { setError(invalid); return; }
    busy.current = true; canWrite.current = false; setOperation('publish'); setError(null);
    try {
      const notice = await service.create(clubId, draft);
      if (alive.current) { setBoard({ ...board, status: { kind: 'created', notice } }); setDirty(false); setVerified(true); }
    } catch (reason) {
      if (!alive.current) return;
      if (accessLost(reason)) clearAccess();
      else {
        setVerified(false);
        try { const next = await service.getBoard(clubId); if (alive.current) applyBoard(next); }
        catch (reloadError) { if (alive.current && accessLost(reloadError)) clearAccess(); }
      }
      if (alive.current) setError(errorText(reason));
    } finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  async function reset() {
    if (busy.current) return false;
    busy.current = true; canWrite.current = false; setOperation('reset'); setError(null);
    try {
      await service.reset(clubId);
      const next = await service.getBoard(clubId);
      if (alive.current) { initialized.current = false; setDirty(false); applyBoard(next); }
      return alive.current;
    } catch (reason) { if (alive.current) { if (accessLost(reason)) clearAccess(); setVerified(false); setError(errorText(reason)); } return false; }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  async function openList() {
    if (busy.current) return;
    busy.current = true; setOperation('open'); setError(null);
    try {
      await clubs.refresh();
      if (!alive.current) return;
      if (await clubs.selectClub(clubId)) { if (alive.current) router.dismissTo('/notice'); }
      else if (alive.current) setError('현재 동아리 소속과 선택을 확인하지 못했어요. 동아리 목록에서 확인해 주세요.');
    } catch (reason) { if (alive.current) setError(errorText(reason)); }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  return { board, draft, dirty, verified, operation, error, change, publish, refresh, reset, openList };
}
