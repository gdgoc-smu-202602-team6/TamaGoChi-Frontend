import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError, apiErrorMessage } from '@/services/api/http-client';
import { useClubs } from '@/state/club-context';
import { useGameServices } from '@/state/game-services';
import { ClubAdminError, type ApplicationDecision, type ClubApplicationBoard, type ReviewApplication } from '@/types/club-admin';

const accessLost = (error: unknown) => error instanceof ClubAdminError && (error.reason === 'forbidden' || error.reason === 'not-found') || error instanceof ApiError && error.status === 401;
function errorText(error: unknown) {
  if (!(error instanceof ClubAdminError)) return apiErrorMessage(error);
  if (error.reason === 'forbidden') return '가입 신청을 관리할 권한이 없어요.';
  if (error.reason === 'not-found') return '동아리 또는 신청을 확인할 수 없어요. 가입 상태를 다시 확인해 주세요.';
  if (error.reason === 'already-member') return '이미 부원인 사용자예요. 신청과 부원 상태를 확인해 주세요.';
  if (error.reason === 'uncertain') return '처리 결과를 확인하지 못했어요. 상태를 다시 불러와 주세요.';
  if (error.reason === 'storage') return '신청 정보를 읽거나 저장하지 못했어요. 상태를 다시 확인해 주세요.';
  return '처리할 신청과 승인·거절 선택을 확인해 주세요.';
}
export function useApplicationReview(clubId: string) {
  const { clubAdmin: service } = useGameServices(), { refresh: refreshClubs } = useClubs();
  const [board, setBoard] = useState<ClubApplicationBoard | null>(null), [refreshing, setRefreshing] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null), [unverified, setUnverified] = useState(true);
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const alive = useRef(true), busy = useRef(false), verified = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; verified.current = false; setRefreshing(true); setError(null); setNotice(null);
    try {
      const next = await service.getBoard(clubId);
      if (alive.current) { setBoard(next); verified.current = true; setUnverified(false); }
    } catch (reason) {
      if (alive.current) { if (accessLost(reason)) setBoard(null); setError(errorText(reason)); setUnverified(true); }
    } finally { busy.current = false; if (alive.current) setRefreshing(false); }
  }, [service, clubId]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => subscription.remove();
  }, [refresh]));
  async function decide(one: ReviewApplication, decision: ApplicationDecision) {
    if (busy.current || !verified.current || one.clubId !== clubId || one.state !== 'PENDING') return;
    busy.current = true; verified.current = false; setProcessing(one.id); setError(null); setNotice(null);
    let result: ReviewApplication | undefined, failure: unknown;
    try { result = await service.decide(clubId, one.id, decision); } catch (reason) { failure = reason; }
    if (!alive.current) return;
    if (failure instanceof ClubAdminError && failure.reason === 'forbidden' || failure instanceof ApiError && failure.status === 401) {
      setBoard(null); setUnverified(true); setError(errorText(failure)); busy.current = false; setProcessing(null); return;
    }
    try {
      const next = await service.getBoard(clubId);
      if (!alive.current) return;
      setBoard(next);
      const pending = next.applications.some(app => app.id === one.id);
      const uncertain = failure instanceof ClubAdminError && (failure.reason === 'uncertain' || failure.reason === 'storage');
      if (!pending) {
        verified.current = true; setUnverified(false);
        setNotice(result ? `${result.nickname || '신청자'}님의 신청은 ${result.state === 'APPROVED' ? '승인' : '거절'} 상태로 확인됐어요.` : '해당 신청은 더 이상 대기 중이 아니에요. 취소되었거나 다른 운영진이 처리했을 수 있어요.');
      } else if (uncertain || result) {
        setUnverified(true); setError('최신 처리 결과를 다시 확인해야 해요. 상태를 불러온 뒤 확인해 주세요.');
      } else {
        verified.current = true; setUnverified(false); setError(errorText(failure));
      }
      await refreshClubs();
    } catch (reason) {
      if (alive.current) { if (accessLost(reason)) setBoard(null); setUnverified(true); setError(accessLost(reason) ? errorText(reason) : '처리 후 목록을 확인하지 못했어요. 상태 다시 확인은 조회만 합니다.'); }
    } finally { busy.current = false; if (alive.current) setProcessing(null); }
  }
  return { board, refreshing, processing, unverified, error, notice, refresh, decide };
}
