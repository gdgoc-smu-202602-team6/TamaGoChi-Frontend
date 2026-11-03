import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { apiErrorMessage } from '@/services/api/http-client';
import { settingsAccessLost } from '@/services/club-settings-service';
import { useClubs } from '@/state/club-context';
import { useGameServices } from '@/state/game-services';
import { ClubSettingsError, type ClubSettings, type ClubSettingsAction } from '@/types/club-settings';
import { normalizeSettingsAction, settingsActionConfirmed } from '@/utils/club-settings';

function message(error: unknown) {
  if (settingsAccessLost(error)) return '이 동아리의 기본 설정을 관리할 권한이 없거나 접근 상태가 바뀌었어요.';
  if (!(error instanceof ClubSettingsError)) return apiErrorMessage(error);
  return { invalid: '동아리 이름은 1~20자로 입력해 주세요.', forbidden: '동아리 기본 설정을 관리할 권한이 없어요.', changed: '다른 곳에서 설정이 바뀌었어요. 최신 내용을 확인하고 다시 선택해 주세요.', uncertain: '처리 결과를 확인하지 못했어요. 설정 다시 확인은 조회만 합니다.', storage: '저장된 동아리 설정을 읽거나 저장하지 못했어요.' }[error.reason];
}
export function useClubSettings(clubId: string) {
  const { clubSettings: service } = useGameServices(), clubs = useClubs(), { refresh: refreshClubs } = clubs;
  const [club, setClub] = useState<ClubSettings | null>(null), [name, setName] = useState(''), [verified, setVerified] = useState(false);
  const [operation, setOperation] = useState<'check' | 'mutate' | 'copy' | 'open' | null>('check'), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const alive = useRef(true), busy = useRef(false), writable = useRef(false), dirty = useRef(false), pending = useRef<ClubSettingsAction | null>(null), renameBase = useRef<ClubSettings | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const clear = useCallback(() => { setClub(null); setName(''); dirty.current = false; pending.current = null; renameBase.current = null; setVerified(false); writable.current = false; }, []);
  const apply = useCallback((next: ClubSettings) => { setClub(next); if (!dirty.current) { setName(next.name); renameBase.current = next; } setVerified(true); writable.current = true; }, []);
  const settle = useCallback((next: ClubSettings, action: ClubSettingsAction) => {
    if (action.kind === 'rename' && settingsActionConfirmed(next, action)) { dirty.current = false; renameBase.current = next; setName(next.name); }
    setNotice('현재 설정에서 처리 상태를 확인했어요.');
  }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; writable.current = false; setVerified(false); setOperation('check'); setError(null); setNotice(null);
    try {
      const next = await service.get(clubId);
      if (alive.current) {
        apply(next);
        if (pending.current) {
          if (settingsActionConfirmed(next, pending.current)) { settle(next, pending.current); await refreshClubs(); }
          else setNotice('최신 설정을 불러왔어요. 결과를 검토한 뒤 작업을 다시 선택해 주세요. 재발급을 다시 요청하면 현재 코드도 사용할 수 없게 돼요.');
          pending.current = null;
        }
      }
    } catch (reason) { if (alive.current) { if (settingsAccessLost(reason)) clear(); setError(message(reason)); } }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }, [service, clubId, apply, clear, settle, refreshClubs]);
  useFocusEffect(useCallback(() => { void refresh(); const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => subscription.remove(); }, [refresh]));
  async function mutate(input: ClubSettingsAction) {
    if (busy.current || !writable.current) return;
    let action: ClubSettingsAction;
    try { action = normalizeSettingsAction(input); } catch (reason) { setError(message(reason)); return; }
    busy.current = true; writable.current = false; pending.current = action; setVerified(false); setOperation('mutate'); setError(null); setNotice(null);
    try { const next = await service.mutate(clubId, action); if (alive.current) { apply(next); settle(next, action); pending.current = null; await refreshClubs(); } }
    catch (reason) {
      if (!alive.current) return;
      if (settingsAccessLost(reason)) clear();
      else if (!(reason instanceof ClubSettingsError && reason.reason === 'uncertain')) {
        pending.current = null;
        try { const next = await service.get(clubId); if (alive.current) apply(next); } catch (readError) { if (alive.current && settingsAccessLost(readError)) clear(); }
      }
      if (alive.current) setError(message(reason));
    } finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  function changeName(value: string) { if (!busy.current && writable.current) { if (!dirty.current) renameBase.current = club; dirty.current = value !== club?.name; setName(value); setError(null); } }
  function resetName() { if (!busy.current && writable.current && club) { dirty.current = false; renameBase.current = club; setName(club.name); setError(null); } }
  function saveName() { const expected = renameBase.current ?? club; if (expected) return mutate({ kind: 'rename', name, expected }); }
  async function copy() {
    if (busy.current || !writable.current || !club) return;
    busy.current = true; setOperation('copy'); setError(null); setNotice(null);
    try { const copied = await Clipboard.setStringAsync(club.inviteCode); if (alive.current) { if (!copied) throw new Error(); setNotice('초대 코드를 복사했어요.'); } }
    catch { if (alive.current) setError('복사하지 못했어요. 코드를 선택하거나 길게 눌러 복사해 주세요.'); }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  async function openList() {
    if (busy.current) return;
    busy.current = true; setOperation('open'); setError(null);
    try { await clubs.refresh(); if (!alive.current) return; const selected = await clubs.selectClub(clubId); if (alive.current) { if (selected) router.dismissTo('/notice'); else setError('현재 소속과 동아리 선택을 확인하지 못했어요. 가입 목록에서 확인해 주세요.'); } }
    catch (reason) { if (alive.current) setError(message(reason)); }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  return { club, name, verified, operation, error, notice, refresh, mutate, saveName, changeName, resetName, copy, openList };
}
