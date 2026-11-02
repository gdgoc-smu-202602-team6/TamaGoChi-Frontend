import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { apiErrorMessage } from '@/services/api/http-client';
import { useClubs } from '@/state/club-context';
import { useGameServices } from '@/state/game-services';
import { ClubJoinError, type ClubApplication, type ClubJoinOverview, type ClubPreview } from '@/types/club-join';
import { clubJoinErrorText, normalizeInviteCode, validInviteCode } from '@/utils/club-join';

const errorText = (error: unknown) => error instanceof ClubJoinError ? clubJoinErrorText(error) : apiErrorMessage(error);
export function useClubJoin() {
  const { clubJoin: service } = useGameServices(), { refresh: refreshClubs, selectClub } = useClubs();
  const [data, setData] = useState<ClubJoinOverview | null>(null), [preview, setPreview] = useState<ClubPreview | null>(null);
  const [code, setCode] = useState(''), [partId, setPartId] = useState<string | null>(null);
  const [operation, setOperation] = useState<'search' | 'apply' | 'cancel' | 'open' | null>(null);
  const [refreshing, setRefreshing] = useState(true), [unverified, setUnverified] = useState(true);
  const [error, setError] = useState<string | null>(null), [loadError, setLoadError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const alive = useRef(true), busy = useRef(false), verified = useRef(false), version = useRef(0);
  const snapshot = useRef<ClubJoinOverview | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const applySnapshot = useCallback((next: ClubJoinOverview) => {
    snapshot.current = next; verified.current = true; setData(next); setUnverified(false); setLoadError(null);
  }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    const request = ++version.current;
    verified.current = false; setRefreshing(true);
    try {
      const next = await service.getOverview();
      if (!alive.current || request !== version.current) return;
      applySnapshot(next); await refreshClubs();
    } catch {
      if (alive.current && request === version.current) { setUnverified(true); setLoadError('가입과 신청 정보를 불러오지 못했어요. 다시 확인한 뒤 신청해 주세요.'); }
    } finally { if (alive.current && request === version.current) setRefreshing(false); }
  }, [service, refreshClubs, applySnapshot]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') void refresh(); });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && snapshot.current?.applications.some(one => one.state === 'PENDING')) void refresh();
    }, 30000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [refresh]));

  const changeCode = (value: string) => {
    if (busy.current) return;
    setCode(normalizeInviteCode(value)); setPreview(null); setPartId(null); setError(null); setNotice(null);
  };
  async function search() {
    if (busy.current) return;
    if (!validInviteCode(code)) { setError(clubJoinErrorText(new ClubJoinError('invalid-code'))); return; }
    busy.current = true; setOperation('search'); setError(null); setNotice(null); setPreview(null); setPartId(null);
    try {
      const found = await service.findClub(code);
      if (alive.current) { setPreview(found); if (!found) setError('일치하는 동아리가 없어요. 초대 코드를 확인해 주세요.'); }
    } catch (reason) { if (alive.current) setError(errorText(reason)); }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }

  async function mutate(kind: 'apply' | 'cancel', clubId: string, work: () => Promise<ClubApplication | 'cancelled' | 'missing'>, applicationId?: string) {
    if (busy.current || !verified.current) return;
    busy.current = true; verified.current = false;
    const request = ++version.current;
    setOperation(kind); setRefreshing(false); setError(null); setNotice(null);
    let result: ClubApplication | 'cancelled' | 'missing' | undefined, failure: unknown;
    try { result = await work(); } catch (reason) { failure = reason; }
    if (!alive.current || request !== version.current) return;
    try {
      const next = await service.getOverview();
      if (!alive.current || request !== version.current) return;
      applySnapshot(next);
      if (kind === 'apply') {
        if (next.clubs.some(club => club.id === clubId)) { setNotice('가입된 동아리임을 확인했어요. 공지를 열 수 있어요.'); setPreview(null); setPartId(null); }
        else if (next.applications.some(one => one.clubId === clubId && one.state === 'PENDING')) { setNotice('가입 신청을 확인했어요. 운영진의 승인을 기다려 주세요.'); setPreview(null); setPartId(null); }
        else if (typeof result === 'object' && next.applications.some(one => one.id === result.id && one.state !== 'PENDING')) setNotice('운영진이 신청을 처리했어요. 신청 내역의 상태를 확인해 주세요.');
        else if (failure) setError(errorText(failure));
        else { verified.current = false; setUnverified(true); setLoadError('신청 결과를 확인하지 못했어요. 신청 상태를 다시 불러와 주세요.'); }
      } else {
        const current = next.applications.find(one => one.id === applicationId);
        if (!current) setNotice(result === 'cancelled' ? '신청 취소를 확인했어요.' : '대기 중인 해당 신청이 더 이상 없어요.');
        else if (current.state !== 'PENDING') setError(clubJoinErrorText(new ClubJoinError('not-pending')));
        else if (failure) setError(errorText(failure));
        else { verified.current = false; setUnverified(true); setLoadError('취소 결과를 확인하지 못했어요. 신청 상태를 다시 불러와 주세요.'); }
      }
      if (failure instanceof ClubJoinError && failure.reason === 'part-missing') { setPreview(null); setPartId(null); }
      await refreshClubs();
    } catch {
      if (alive.current && request === version.current) { setUnverified(true); setLoadError('요청 결과를 다시 확인해야 해요. 상태를 불러온 뒤 신청 내역을 확인해 주세요.'); }
    } finally { busy.current = false; if (alive.current && request === version.current) setOperation(null); }
  }
  async function apply() {
    if (!preview || !partId || !snapshot.current || snapshot.current.clubs.some(club => club.id === preview.id) || snapshot.current.applications.some(one => one.clubId === preview.id && one.state === 'PENDING')) return;
    await mutate('apply', preview.id, () => service.apply(preview.id, partId));
  }
  async function cancel(one: ClubApplication) {
    if (one.state !== 'PENDING') return;
    await mutate('cancel', one.clubId, () => service.cancel(one.clubId, one.id), one.id);
  }
  async function openClub(id: string) {
    if (busy.current || !verified.current || !snapshot.current?.clubs.some(club => club.id === id)) return;
    busy.current = true; setOperation('open'); setError(null);
    try {
      await refreshClubs();
      if (!alive.current) return;
      const selected = await selectClub(id);
      if (!alive.current) return;
      if (!selected) setError('가입 정보 또는 동아리 선택을 확인하지 못했어요. 상태를 다시 불러와 주세요.');
      else router.dismissTo('/notice');
    } finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  return { data, preview, code, partId, setPartId, changeCode, operation, refreshing, unverified, error, loadError, notice, refresh, search, apply, cancel, openClub };
}
