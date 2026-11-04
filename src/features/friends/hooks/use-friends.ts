import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, apiErrorMessage } from '@/services/api/http-client';
import { useGameServices } from '@/state/game-services';
import { FriendsError } from '@/types/friends';

function message(error: unknown) {
  if (error instanceof FriendsError) return { invalid: '현재 부원과 방을 확인해 주세요.', changed: '부원 정보가 바뀌었어요. 방을 다시 확인한 뒤 선택해 주세요.', uncertain: '좋아요 결과를 확인하지 못했어요. 방 다시 확인은 조회만 합니다.', storage: '저장된 좋아요를 읽지 못했어요. 기록은 유지돼요.' }[error.reason];
  if (error instanceof ApiError && [403, 404].includes(error.status ?? 0)) return '현재 이 동아리나 부원의 방을 볼 수 없어요. 가입 상태를 확인해 주세요.';
  return apiErrorMessage(error);
}
function useFriendsData<T>(read: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null), [operation, setOperation] = useState<'read' | 'like' | null>('read'), [verified, setVerified] = useState(false), [error, setError] = useState<string | null>(null);
  const alive = useRef(true), busy = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const run = useCallback(async (work: () => Promise<T>, kind: 'read' | 'like') => {
    if (busy.current) return;
    busy.current = true; setVerified(false); setOperation(kind); setError(null);
    try { const next = await work(); if (alive.current) { setData(next); setVerified(true); } }
    catch (reason) { if (alive.current) { if (reason instanceof ApiError && (reason.kind === 'session' || [401, 403, 404].includes(reason.status ?? 0))) setData(null); setError(message(reason)); } }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }, []);
  const refresh = useCallback(() => run(read, 'read'), [read, run]);
  useFocusEffect(useCallback(() => { void refresh(); const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => subscription.remove(); }, [refresh]));
  return { data, operation, verified, error, refresh, run };
}
export function useFriends(clubId: string) {
  const { friends } = useGameServices();
  return useFriendsData(useCallback(() => friends.getBoard(clubId), [friends, clubId]));
}
export function useFriendVisit(clubId: string, memberId: string) {
  const { friends } = useGameServices(), state = useFriendsData(useCallback(() => friends.getVisit(clubId, memberId), [friends, clubId, memberId]));
  const setLike = () => { if (!state.data || !state.verified || state.operation) return; const { member, likedByMe } = state.data.friend; return state.run(() => friends.setLike(clubId, member, !likedByMe), 'like'); };
  return { ...state, setLike };
}
