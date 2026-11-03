import type { ClubPermission } from './club-admin';
import type { ClubPart } from './club-join';
import type { JoinedClub } from './notice';

export type ClubRole = { id: string; name: string; permissions: readonly ClubPermission[] };
export type ClubMember = { id: string; clubId: string; userId: string; nickname: string; partId: string; roleId: string; joinedAt: string };
export type ClubMembersBoard = { club: JoinedClub; me: ClubMember; parts: readonly ClubPart[]; roles: readonly ClubRole[]; members: readonly ClubMember[] };
export type MemberRoleChange = { member: ClubMember; role: ClubRole };
export type MemberRoleOutcome = { kind: 'board'; board: ClubMembersBoard } | { kind: 'access-changed' };
export type ClubMembersService = { getBoard: (id: string) => Promise<ClubMembersBoard>; changeRole: (id: string, action: MemberRoleChange) => Promise<MemberRoleOutcome>; removeMember: (id: string, member: ClubMember) => Promise<MemberRoleOutcome> };
export class ClubMembersError extends Error {
  constructor(readonly reason: 'invalid' | 'forbidden' | 'changed' | 'last-manager' | 'uncertain' | 'storage') { super(`Club members ${reason}`); this.name = 'ClubMembersError'; }
}
