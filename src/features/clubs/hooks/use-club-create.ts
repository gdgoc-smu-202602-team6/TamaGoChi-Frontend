import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { apiErrorMessage } from '@/services/api/http-client';
import { useClubs } from '@/state/club-context';
import { useGameServices } from '@/state/game-services';
import { ClubCreateError, type ClubCreateInput, type ClubCreateStatus } from '@/types/club-create';
import { validateClubCreate } from '@/utils/club-create';

function errorText(error: unknown) {
  if (!(error instanceof ClubCreateError)) return apiErrorMessage(error);
  if (error.reason === 'storage') return '생성 요청 기록을 읽거나 저장하지 못했어요. 다시 확인해 주세요.';
  if (error.reason === 'uncertain') return '생성 요청의 결과가 확실하지 않아요. 가입 목록부터 확인해 주세요.';
  if (error.reason === 'already-created') return '이미 확인된 동아리가 있어요. 새 요청 전에 생성 결과를 확인해 주세요.';
  return '동아리 이름과 파트, 내 소속 선택을 확인해 주세요.';
}
export function useClubCreate() {
  const { clubCreate: service } = useGameServices();
  const { refresh: refreshClubs, selectClub } = useClubs();
  const [status, setStatus] = useState<ClubCreateStatus | null>(null);
  const [operation, setOperation] = useState<'check' | 'create' | 'reset' | 'open' | null>('check');
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true), busy = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; setOperation('check'); setError(null);
    try {
      const next = await service.getStatus();
      if (alive.current) setStatus(next);
    } catch (reason) { if (alive.current) { setStatus(null); setError(errorText(reason)); } }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }, [service]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') void refresh(); });
    return () => subscription.remove();
  }, [refresh]));
  async function create(input: ClubCreateInput) {
    if (busy.current || status?.kind !== 'ready') return;
    const invalid = validateClubCreate(input);
    if (invalid) { setError(invalid); return; }
    busy.current = true; setOperation('create'); setError(null);
    try {
      const club = await service.create(input);
      if (alive.current) setStatus({ kind: 'created', club });
      await refreshClubs();
    } catch (reason) {
      if (!alive.current) return;
      try { const next = await service.getStatus(); if (alive.current) setStatus(next); }
      catch { if (alive.current) setStatus(null); }
      if (alive.current) setError(errorText(reason));
      await refreshClubs();
    } finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  async function reset() {
    if (busy.current) return false;
    busy.current = true; setOperation('reset'); setError(null);
    try { await service.reset(); if (alive.current) setStatus({ kind: 'ready' }); return alive.current; }
    catch (reason) { if (alive.current) setError(errorText(reason)); return false; }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  async function openClub() {
    if (busy.current || status?.kind !== 'created') return;
    busy.current = true; setOperation('open'); setError(null);
    try {
      const current = await service.getStatus();
      if (!alive.current) return;
      setStatus(current);
      if (current.kind !== 'created') return;
      await refreshClubs();
      if (!alive.current) return;
      const selected = await selectClub(current.club.id);
      if (!alive.current) return;
      if (selected) router.dismissTo('/notice');
      else setError('부원 자격 또는 동아리 선택을 확인하지 못했어요. 결과를 다시 확인해 주세요.');
    } catch (reason) { if (alive.current) { setStatus(null); setError(errorText(reason)); } }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  return { status, operation, error, refresh, create, reset, openClub };
}
