import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { apiErrorMessage } from '@/services/api/http-client';
import { partsAccessLost } from '@/services/club-parts-service';
import { useClubs } from '@/state/club-context';
import { useGameServices } from '@/state/game-services';
import { ClubPartsError, type ClubPartAction, type ClubPartsBoard } from '@/types/club-parts';
import type { PaletteColor } from '@/types/notice';
import { normalizePartAction, partActionConfirmed } from '@/utils/club-parts';

function message(error: unknown) {
  if (partsAccessLost(error)) return '이 동아리의 파트를 관리할 권한이 없거나 접근 상태가 바뀌었어요.';
  if (!(error instanceof ClubPartsError)) return apiErrorMessage(error);
  return { invalid: '파트 이름은 1~10자로 입력하고 색상을 선택해 주세요.', forbidden: '파트 관리 권한이 없어요.', duplicate: '같은 이름의 파트가 이미 있어요.', 'in-use': '부원이나 승인 대기 신청에서 쓰는 파트는 삭제할 수 없어요.', changed: '확인 중 파트 내용이 바뀌었어요. 현재 목록을 확인하고 다시 선택해 주세요.', uncertain: '처리 결과를 확인하지 못했어요. 파트 목록 다시 확인은 조회만 합니다.', storage: '저장된 파트를 읽거나 저장하지 못했어요.' }[error.reason];
}
export function useClubParts(clubId: string) {
  const { clubParts: service } = useGameServices(), clubs = useClubs();
  const [board, setBoard] = useState<ClubPartsBoard | null>(null), [name, setName] = useState(''), [color, setColor] = useState<PaletteColor>('GREEN'), [verified, setVerified] = useState(false);
  const [operation, setOperation] = useState<'check' | 'mutate' | 'open' | null>('check'), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const alive = useRef(true), busy = useRef(false), writable = useRef(false), pending = useRef<ClubPartAction | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const clear = useCallback(() => { setBoard(null); setName(''); setColor('GREEN'); pending.current = null; setVerified(false); writable.current = false; }, []);
  const apply = useCallback((next: ClubPartsBoard) => { setBoard(next); setVerified(true); writable.current = true; }, []);
  const settle = useCallback((action: ClubPartAction) => { if (action.kind === 'add') setName(old => old.trim() === action.name.trim() ? '' : old); setNotice('현재 파트 목록에서 처리 상태를 확인했어요.'); }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; writable.current = false; setVerified(false); setOperation('check'); setError(null); setNotice(null);
    try {
      const next = await service.getBoard(clubId);
      if (alive.current) {
        apply(next);
        if (pending.current) { if (partActionConfirmed(next, pending.current)) settle(pending.current); else setNotice('최신 목록을 불러왔어요. 처리 상태를 확인한 뒤 작업을 다시 선택해 주세요.'); pending.current = null; }
      }
    } catch (reason) { if (alive.current) { if (partsAccessLost(reason)) clear(); setError(message(reason)); } }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }, [service, clubId, apply, clear, settle]);
  useFocusEffect(useCallback(() => { void refresh(); const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => subscription.remove(); }, [refresh]));
  async function mutate(input: ClubPartAction) {
    if (busy.current || !writable.current) return;
    let action: ClubPartAction;
    try { action = normalizePartAction(input); } catch (reason) { setError(message(reason)); return; }
    busy.current = true; writable.current = false; pending.current = action; setVerified(false); setOperation('mutate'); setError(null); setNotice(null);
    try { const next = await service.mutate(clubId, action); if (alive.current) { apply(next); settle(action); pending.current = null; } }
    catch (reason) {
      if (!alive.current) return;
      if (partsAccessLost(reason)) clear();
      else if (!(reason instanceof ClubPartsError && reason.reason === 'uncertain')) {
        pending.current = null;
        try { const next = await service.getBoard(clubId); if (alive.current) apply(next); } catch (readError) { if (alive.current && partsAccessLost(readError)) clear(); }
      }
      if (alive.current) setError(message(reason));
    } finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  function changeName(value: string) { if (!busy.current && writable.current) { setName(value); setError(null); } }
  function changeColor(value: PaletteColor) { if (!busy.current && writable.current) { setColor(value); setError(null); } }
  async function openList() {
    if (busy.current) return;
    busy.current = true; setOperation('open'); setError(null);
    try { await clubs.refresh(); if (!alive.current) return; const selected = await clubs.selectClub(clubId); if (alive.current) { if (selected) router.dismissTo('/notice'); else setError('현재 소속과 동아리 선택을 확인하지 못했어요. 가입 목록에서 확인해 주세요.'); } }
    catch (reason) { if (alive.current) setError(message(reason)); }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  return { board, name, color, verified, operation, error, notice, refresh, mutate, changeName, changeColor, openList };
}
