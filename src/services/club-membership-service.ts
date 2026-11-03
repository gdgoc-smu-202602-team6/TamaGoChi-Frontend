import { ApiError } from './api/http-client';
import { ClubMembershipError, type ClubMembershipService, type MembershipState } from '../types/club-membership';
import type { ClubMember } from '../types/club-members';
import { sameMember } from '../utils/club-members';

export function createClubMembershipService(backend: { getState: (id: string) => Promise<MembershipState>; remove: (id: string, expected: ClubMember) => Promise<void> }): ClubMembershipService {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  return {
    getState: id => serial(() => backend.getState(id)),
    leave: (id, expected) => serial(async () => {
      if (expected.clubId !== id) throw new ClubMembershipError('invalid');
      const before = await backend.getState(id);
      if (before.kind === 'absent') return before;
      if (!sameMember(before.data.member, expected)) throw new ClubMembershipError('changed');
      try { await backend.remove(id, expected); }
      catch (error) {
        if (error instanceof ApiError && error.kind === 'http' && error.status && error.status < 500 && error.status !== 408 && error.status !== 404) {
          if (error.status === 409 && error.code === 'last-manager') throw new ClubMembershipError('last-manager');
          throw error;
        }
        if (error instanceof ClubMembershipError && ['invalid', 'changed', 'last-manager'].includes(error.reason)) throw error;
      }
      let actual: MembershipState;
      try { actual = await backend.getState(id); } catch (error) { if (error instanceof ApiError && (error.status === 401 || error.kind === 'session')) throw error; throw new ClubMembershipError('uncertain'); }
      if (actual.kind === 'member' && actual.data.member.id === expected.id) throw new ClubMembershipError('uncertain');
      return actual;
    }),
  };
}
