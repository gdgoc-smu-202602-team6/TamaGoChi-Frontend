import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { isMockMode } from '@/constants/api';
import { ApiError, apiErrorMessage } from '@/services/api/http-client';
import { useAuth } from '@/state/auth-context';
import { useGameServices } from '@/state/game-services';
import { PersonalSettingsError, type ClubPreferences, type ClubPreferencesInput } from '@/types/personal-settings';
import type { AuthUser } from '@/types/auth';

function message(error: unknown) {
  if (error instanceof PersonalSettingsError) return { invalid: '닉네임이나 선택한 설정을 확인해 주세요.', changed: '확인 중 현재 정보가 바뀌었어요. 다시 조회하고 현재 값으로 입력한 뒤 저장해 주세요.', uncertain: '저장 결과를 확인하지 못했어요. 설정 다시 확인은 조회만 합니다.', storage: '저장된 설정을 읽거나 저장하지 못했어요. 기존 기록은 유지돼요.' }[error.reason];
  if (error instanceof ApiError && [403, 404].includes(error.status ?? 0)) return '현재 이 설정에 접근할 수 없어요. 계정과 동아리 가입 상태를 확인해 주세요.';
  return apiErrorMessage(error);
}
function useSettingsData<T>(read: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null), [verified, setVerified] = useState(false), [operation, setOperation] = useState<'read' | 'save' | null>('read'), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const alive = useRef(true), busy = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const run = useCallback(async (kind: 'read' | 'save', work: () => Promise<T>) => {
    if (busy.current) return null;
    busy.current = true; setOperation(kind); setVerified(false); setError(null); setNotice(null);
    try { const next = await work(); if (alive.current) { setData(next); setVerified(true); if (kind === 'save') setNotice('현재 저장된 설정을 확인했어요.'); return next; } }
    catch (reason) { if (alive.current) { if (reason instanceof ApiError && (reason.kind === 'session' || [401, 403, 404].includes(reason.status ?? 0))) setData(null); setError(message(reason)); } }
    finally { busy.current = false; if (alive.current) setOperation(null); }
    return null;
  }, []);
  const refresh = useCallback(() => run('read', read), [run, read]);
  useFocusEffect(useCallback(() => { void refresh(); const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => sub.remove(); }, [refresh]));
  return { data, verified, operation, error, notice, refresh, run };
}
export function useAccountSettings() {
  const { personalSettings, invalidate } = useGameServices(), { refresh: refreshAuth } = useAuth(), state = useSettingsData(useCallback(() => personalSettings.getAccount(), [personalSettings]));
  const save = (before: AuthUser, nickname: string) => state.run('save', async () => { const next = await personalSettings.rename(before, nickname); invalidate(); if (!isMockMode) await refreshAuth(); return next; });
  return { ...state, save };
}
export function useClubPreferences(clubId: string) {
  const { personalSettings, invalidate } = useGameServices(), state = useSettingsData(useCallback(() => personalSettings.getClub(clubId), [personalSettings, clubId]));
  const save = (before: ClubPreferences, input: ClubPreferencesInput) => state.run('save', async () => { const next = await personalSettings.updateClub(before, input); invalidate(); return next; });
  return { ...state, save };
}
