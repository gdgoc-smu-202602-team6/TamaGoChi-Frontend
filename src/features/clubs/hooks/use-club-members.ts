import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { apiErrorMessage } from '@/services/api/http-client';
import { membersAccessLost } from '@/services/club-members-service';
import { useClubs } from '@/state/club-context';
import { useGameServices } from '@/state/game-services';
import { ClubMembersError, type ClubMember, type ClubMembersBoard, type MemberRoleChange } from '@/types/club-members';

function message(error: unknown) {
  if (membersAccessLost(error)) return '이 동아리의 부원·역할을 관리할 권한이 없거나 접근 상태가 바뀌었어요.';
  if (!(error instanceof ClubMembersError)) return apiErrorMessage(error);
  return { invalid: '부원과 선택한 역할을 확인해 주세요.', forbidden: '부원 관리 권한이 없어요.', changed: '확인 중 부원이나 역할이 바뀌었어요. 현재 목록을 확인하고 다시 선택해 주세요.', 'last-manager': '마지막 운영진은 부원으로 바꿀 수 없어요. 먼저 다른 부원을 운영진으로 지정해 주세요.', uncertain: '역할 변경 결과를 확인하지 못했어요. 부원 목록 다시 확인은 조회만 합니다.', storage: '저장된 부원 역할을 읽거나 저장하지 못했어요.' }[error.reason];
}
export function useClubMembers(clubId: string) {
  const { clubMembers: service } = useGameServices(), clubs = useClubs();
  const [board, setBoard] = useState<ClubMembersBoard | null>(null), [verified, setVerified] = useState(false), [operation, setOperation] = useState<'check' | 'change' | 'remove' | 'open' | null>('check');
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const alive = useRef(true), busy = useRef(false), writable = useRef(false), pending = useRef<{ kind: 'role'; action: MemberRoleChange } | { kind: 'remove'; member: ClubMember } | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const clear = useCallback(() => { setBoard(null); setVerified(false); writable.current = false; pending.current = null; }, []);
  const apply = useCallback((next: ClubMembersBoard) => { setBoard(next); setVerified(true); writable.current = true; }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; writable.current = false; setVerified(false); setOperation('check'); setError(null); setNotice(null);
    try {
      const next = await service.getBoard(clubId);
      if (alive.current) {
        apply(next);
        if (pending.current) { const task = pending.current, expected = task.kind === 'role' ? task.action.member : task.member, actual = next.members.find(one => one.id === expected.id); setNotice(task.kind === 'role' && actual?.role === task.action.role ? '현재 목록에서 역할 상태를 확인했어요.' : task.kind === 'remove' && !actual ? '현재 목록에 대상 부원이 없음을 확인했어요.' : '최신 목록을 불러왔어요. 결과를 확인한 뒤 작업을 다시 선택해 주세요.'); pending.current = null; }
      }
    } catch (reason) { if (alive.current) { if (membersAccessLost(reason)) clear(); setError(message(reason)); } }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }, [service, clubId, apply, clear]);
  useFocusEffect(useCallback(() => { void refresh(); const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => subscription.remove(); }, [refresh]));
  async function changeRole(action: MemberRoleChange) {
    if (busy.current || !writable.current) return;
    busy.current = true; writable.current = false; pending.current = { kind: 'role', action }; setVerified(false); setOperation('change'); setError(null); setNotice(null);
    try {
      const result = await service.changeRole(clubId, action);
      if (alive.current) { if (result.kind === 'access-changed') { clear(); setNotice('현재 계정의 관리 권한이 바뀌었어요. 공지 목록에서 이용 가능한 기능을 확인해 주세요.'); } else { apply(result.board); pending.current = null; setNotice('현재 목록에서 역할 상태를 확인했어요.'); } }
    } catch (reason) {
      if (!alive.current) return;
      if (membersAccessLost(reason)) clear();
      else if (!(reason instanceof ClubMembersError && reason.reason === 'uncertain')) {
        pending.current = null;
        try { const next = await service.getBoard(clubId); if (alive.current) apply(next); } catch (readError) { if (alive.current && membersAccessLost(readError)) clear(); }
      }
      if (alive.current) setError(message(reason));
    } finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  async function removeMember(member: ClubMember) {
    if (busy.current || !writable.current) return;
    busy.current = true; writable.current = false; pending.current = { kind: 'remove', member }; setVerified(false); setOperation('remove'); setError(null); setNotice(null);
    try {
      const result = await service.removeMember(clubId, member);
      if (alive.current) { if (result.kind === 'access-changed') { clear(); setNotice('현재 계정의 관리 권한이 바뀌었어요. 공지 목록에서 이용 가능한 기능을 확인해 주세요.'); } else { apply(result.board); pending.current = null; setNotice('현재 목록에 대상 부원이 없음을 확인했어요.'); } await clubs.refresh(); }
    } catch (reason) {
      if (!alive.current) return;
      if (membersAccessLost(reason)) clear();
      else if (!(reason instanceof ClubMembersError && reason.reason === 'uncertain')) { pending.current = null; try { const next = await service.getBoard(clubId); if (alive.current) apply(next); } catch (readError) { if (alive.current && membersAccessLost(readError)) clear(); } }
      if (alive.current) setError(reason instanceof ClubMembersError && reason.reason === 'uncertain' ? '강퇴 결과를 확인하지 못했어요. 부원 목록 다시 확인은 조회만 합니다.' : reason instanceof ClubMembersError && reason.reason === 'last-manager' ? '마지막 운영진은 강퇴할 수 없어요. 먼저 다른 부원을 운영진으로 지정해 주세요.' : message(reason));
    } finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  async function openList() {
    if (busy.current) return;
    busy.current = true; setOperation('open'); setError(null);
    try { await clubs.refresh(); if (!alive.current) return; const selected = await clubs.selectClub(clubId); if (alive.current) { if (selected) router.dismissTo('/notice'); else setError('현재 소속과 동아리 선택을 확인하지 못했어요. 가입 목록에서 확인해 주세요.'); } }
    catch (reason) { if (alive.current) setError(message(reason)); }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  return { board, verified, operation, error, notice, refresh, changeRole, removeMember, openList };
}
