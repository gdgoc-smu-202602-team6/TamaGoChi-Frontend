import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, apiErrorMessage } from '@/services/api/http-client';
import { useClubs } from '@/state/club-context';
import { useGameServices } from '@/state/game-services';
import { ClubAdminError } from '@/types/club-admin';
import type { PaletteColor } from '@/types/notice';
import { NoticeCategoryError, type CategoryAction, type CategoryBoard } from '@/types/notice-categories';
import { categoryActionConfirmed, normalizeCategoryAction } from '@/utils/notice-categories';

function accessLost(error: unknown) { return (error instanceof ApiError && [401, 403, 404].includes(error.status ?? 0)) || (error instanceof ClubAdminError && ['forbidden', 'not-found'].includes(error.reason)) || (error instanceof NoticeCategoryError && error.reason === 'forbidden'); }
function message(error: unknown) {
  if (accessLost(error)) return '이 동아리의 공지 분류를 관리할 권한이 없거나 접근 상태가 바뀌었어요.';
  if (!(error instanceof NoticeCategoryError)) return apiErrorMessage(error);
  const messages: Record<NoticeCategoryError['reason'], string> = {
    invalid: '이름은 1~10자로 입력하고 분류 색상을 선택해 주세요.', forbidden: '공지 분류 관리 권한이 없어요.', missing: '분류를 더 이상 확인할 수 없어요. 목록을 다시 확인해 주세요.',
    duplicate: '같은 이름이 이미 있어요. 다른 이름을 입력해 주세요.', preset: '기본 전체공지는 삭제할 수 없어요.', 'in-use': '공지에서 사용 중인 항목은 삭제할 수 없어요.',
    changed: '확인 중 분류 내용이 바뀌었어요. 현재 목록을 확인한 뒤 다시 선택해 주세요.', uncertain: '처리 결과를 확인하지 못했어요. 목록 다시 확인은 조회만 합니다.', storage: '저장된 분류를 읽거나 저장하지 못했어요. 목록을 다시 확인해 주세요.',
  };
  return messages[error.reason];
}
export function useCategoryManager(clubId: string) {
  const { noticeCategories: service } = useGameServices(), clubs = useClubs();
  const [board, setBoard] = useState<CategoryBoard | null>(null), [operation, setOperation] = useState<'check' | 'mutate' | 'open' | null>('check'), [verified, setVerified] = useState(false);
  const [name, setName] = useState(''), [color, setColor] = useState<PaletteColor>('GREEN'), [subNames, setSubNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const alive = useRef(true), busy = useRef(false), canWrite = useRef(false), pending = useRef<CategoryAction | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const clearAccess = useCallback(() => { setBoard(null); setName(''); setColor('GREEN'); setSubNames({}); pending.current = null; setVerified(false); canWrite.current = false; }, []);
  const apply = useCallback((next: CategoryBoard) => { setBoard(next); setVerified(true); canWrite.current = true; setSubNames(old => Object.fromEntries(Object.entries(old).filter(([id]) => next.categories.some(one => one.id === id)))); }, []);
  const clearInput = useCallback((action: CategoryAction) => {
    if (action.kind === 'add-category') setName(old => old.trim() === action.name.trim() ? '' : old);
    if (action.kind === 'add-subcategory') setSubNames(old => ({ ...old, [action.categoryId]: old[action.categoryId]?.trim() === action.name.trim() ? '' : old[action.categoryId] }));
  }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; canWrite.current = false; setVerified(false); setOperation('check'); setError(null); setNotice(null);
    try {
      const next = await service.getBoard(clubId);
      if (alive.current) {
        apply(next);
        if (pending.current) { if (categoryActionConfirmed(next, pending.current)) { clearInput(pending.current); setNotice('현재 목록에서 처리 상태를 확인했어요.'); } else setNotice('최신 목록을 불러왔어요. 결과를 확인한 뒤 작업을 선택해 주세요.'); pending.current = null; }
      }
    } catch (reason) { if (alive.current) { if (accessLost(reason)) clearAccess(); setError(message(reason)); } }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }, [service, clubId, apply, clearAccess, clearInput]);
  useFocusEffect(useCallback(() => { void refresh(); const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => subscription.remove(); }, [refresh]));
  async function mutate(input: CategoryAction) {
    if (busy.current || !canWrite.current) return;
    let action: CategoryAction;
    try { action = normalizeCategoryAction(input); } catch (reason) { setError(message(reason)); return; }
    busy.current = true; canWrite.current = false; pending.current = action; setVerified(false); setOperation('mutate'); setError(null); setNotice(null);
    try { const next = await service.mutate(clubId, action); if (alive.current) { apply(next); clearInput(action); pending.current = null; setNotice('최신 분류 목록에서 처리 상태를 확인했어요.'); } }
    catch (reason) {
      if (!alive.current) return;
      if (accessLost(reason)) clearAccess();
      else if (!(reason instanceof NoticeCategoryError && reason.reason === 'uncertain')) {
        pending.current = null;
        try { const next = await service.getBoard(clubId); if (alive.current) apply(next); } catch (readError) { if (alive.current && accessLost(readError)) clearAccess(); }
      }
      if (alive.current) setError(message(reason));
    } finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  function changeName(value: string) { if (!busy.current && canWrite.current) { setName(value); setError(null); } }
  function changeColor(value: PaletteColor) { if (!busy.current && canWrite.current) { setColor(value); setError(null); } }
  function changeSubName(id: string, value: string) { if (!busy.current && canWrite.current) { setSubNames(old => ({ ...old, [id]: value })); setError(null); } }
  async function openList() {
    if (busy.current) return;
    busy.current = true; setOperation('open'); setError(null);
    try { await clubs.refresh(); if (!alive.current) return; const selected = await clubs.selectClub(clubId); if (alive.current) { if (selected) router.dismissTo('/notice'); else setError('현재 동아리 소속과 선택을 확인하지 못했어요. 동아리 목록에서 확인해 주세요.'); } }
    catch (reason) { if (alive.current) setError(message(reason)); }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  return { board, operation, verified, name, color, subNames, error, notice, refresh, mutate, changeName, changeColor, changeSubName, openList };
}
