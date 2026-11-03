import { ApiError } from './api/http-client';
import { ClubAdminError, type ClubPermission } from '../types/club-admin';
import { ClubMembersError, type ClubMember, type ClubMembersBoard, type ClubMembersService, type MemberRoleChange, type MemberRoleOutcome } from '../types/club-members';
import { sameMember, sameRole } from '../utils/club-members';

export function membersAccessLost(error: unknown) {
  return (error instanceof ApiError && [401, 403, 404].includes(error.status ?? 0)) || (error instanceof ClubAdminError && ['forbidden', 'not-found'].includes(error.reason)) || (error instanceof ClubMembersError && error.reason === 'forbidden');
}
export function createClubMembersService(backend: { getBoard: (id: string) => Promise<ClubMembersBoard>; getPermissions: (id: string) => Promise<readonly ClubPermission[]>; patch: (id: string, action: MemberRoleChange) => Promise<ClubMember> }): ClubMembersService {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  async function actual(id: string, action: MemberRoleChange): Promise<MemberRoleOutcome> {
    try {
      if (!(await backend.getPermissions(id)).includes('members.manage')) return { kind: 'access-changed' };
      const board = await backend.getBoard(id), member = board.members.find(one => one.id === action.member.id);
      if (member?.userId === action.member.userId && member.joinedAt === action.member.joinedAt && member.roleId === action.role.id) return { kind: 'board', board };
    } catch (error) { if (membersAccessLost(error)) throw error; }
    throw new ClubMembersError('uncertain');
  }
  return {
    getBoard: id => serial(() => backend.getBoard(id)),
    changeRole: (id, action) => serial(async () => {
      if (action.member.clubId !== id) throw new ClubMembersError('invalid');
      const board = await backend.getBoard(id), member = board.members.find(one => one.id === action.member.id), role = board.roles.find(one => one.id === action.role.id);
      if (!member || !role || !sameRole(role, action.role)) throw new ClubMembersError('changed');
      if (member.userId === action.member.userId && member.joinedAt === action.member.joinedAt && member.roleId === role.id) return { kind: 'board', board };
      if (!sameMember(member, action.member)) throw new ClubMembersError('changed');
      try {
        const receipt = await backend.patch(id, action);
        if (receipt.id !== member.id || receipt.clubId !== id || receipt.userId !== member.userId || receipt.joinedAt !== member.joinedAt || receipt.roleId !== role.id) throw new ApiError('response');
      } catch (error) {
        if (error instanceof ApiError && error.kind === 'http' && error.status && error.status < 500 && error.status !== 408) {
          if (error.status === 409 && error.code === 'last-manager') throw new ClubMembersError('last-manager');
          if (error.status === 404) throw new ClubMembersError('changed');
          throw error;
        }
        if (error instanceof ClubMembersError && ['invalid', 'forbidden', 'changed', 'last-manager'].includes(error.reason)) throw error;
      }
      return actual(id, action);
    }),
  };
}
