import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, apiErrorMessage } from '@/services/api/http-client';
import { useClubs } from '@/state/club-context';
import { useGameServices } from '@/state/game-services';
import { ClubMembershipError, type MembershipState } from '@/types/club-membership';
import type { ClubMember } from '@/types/club-members';

function message(error: unknown) {
  if (!(error instanceof ClubMembershipError)) return apiErrorMessage(error);
  return { invalid: '현재 부원 자격을 확인해 주세요.', changed: '확인 중 부원 자격이 바뀌었어요. 현재 정보를 확인한 뒤 다시 선택해 주세요.', 'last-manager': '마지막 관리자는 탈퇴할 수 없어요. 먼저 다른 부원에게 부원 관리 권한을 부여해 주세요.', uncertain: '탈퇴 결과를 확인하지 못했어요. 부원 자격 다시 확인은 조회만 합니다.', storage: '저장된 부원 자격을 읽거나 저장하지 못했어요.' }[error.reason];
}
export function useClubMembership(clubId: string) {
  const { clubMembership: service } = useGameServices(), { forgetClub, error: clubError } = useClubs();
  const [state, setState] = useState<MembershipState | null>(null), [verified, setVerified] = useState(false), [operation, setOperation] = useState<'check' | 'leave' | null>('check'), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const alive = useRef(true), busy = useRef(false), writable = useRef(false), pending = useRef<ClubMember | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const apply = useCallback(async (next: MembershipState) => {
    setState(next); setVerified(true); writable.current = true;
    if (next.kind === 'absent') { pending.current = null; setNotice('현재 이 동아리의 부원 자격이 없어요. 개인 공부·볼트·방은 그대로 이용할 수 있어요.'); await forgetClub(clubId); }
  }, [forgetClub, clubId]);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; writable.current = false; setVerified(false); setOperation('check'); setError(null); setNotice(null);
    try { const next = await service.getState(clubId); if (alive.current) { const expected = pending.current; await apply(next); if (alive.current && next.kind === 'member' && expected) { pending.current = null; setNotice(next.data.member.id !== expected.id ? '새 부원 자격을 확인했어요. 현재 정보를 확인한 뒤 작업을 선택해 주세요.' : '현재 부원 자격을 불러왔어요. 처리 상태를 확인한 뒤 작업을 다시 선택해 주세요.'); } } }
    catch (reason) { if (alive.current) { if (reason instanceof ApiError && [401, 403, 404].includes(reason.status ?? 0)) setState(null); setError(message(reason)); } }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }, [service, clubId, apply]);
  useFocusEffect(useCallback(() => { void refresh(); const subscription = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); }); return () => subscription.remove(); }, [refresh]));
  async function leave(expected: ClubMember) {
    if (busy.current || !writable.current) return;
    busy.current = true; writable.current = false; pending.current = expected; setVerified(false); setOperation('leave'); setError(null); setNotice(null);
    try { const next = await service.leave(clubId, expected); if (alive.current) { await apply(next); pending.current = null; if (alive.current && next.kind === 'member') setNotice('다른 부원 자격이 확인됐어요. 새 자격은 삭제하지 않았어요. 현재 정보를 다시 확인해 주세요.'); } }
    catch (reason) {
      if (!alive.current) return;
      if (!(reason instanceof ClubMembershipError && reason.reason === 'uncertain')) { pending.current = null; try { const next = await service.getState(clubId); if (alive.current) await apply(next); } catch (readError) { if (alive.current && readError instanceof ApiError && [401, 403, 404].includes(readError.status ?? 0)) setState(null); } }
      if (alive.current) setError(message(reason));
    } finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  return { state, verified, operation, error, notice, clubError, refresh, leave };
}
