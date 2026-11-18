import { clubPermissions, type ClubPermission } from './club-admin';
import type { ClubPart } from './club-join';
import type { JoinedClub } from './notice';

/** OpenAPI `MemberRole` (A-50): MANAGER(운영진) holds every Permission, MEMBER(부원) holds none. */
export const clubMemberRoles = ['MANAGER', 'MEMBER'] as const;
export type ClubMemberRole = typeof clubMemberRoles[number];
export const clubMemberRolePermissions: Record<ClubMemberRole, readonly ClubPermission[]> = { MANAGER: clubPermissions, MEMBER: [] };
export function isClubMemberRole(value: unknown): value is ClubMemberRole { return clubMemberRoles.includes(value as ClubMemberRole); }
export type ClubMember = { id: string; clubId: string; userId: string; nickname: string; partId: string; role: ClubMemberRole; joinedAt: string };
export type ClubMembersBoard = { club: JoinedClub; me: ClubMember; parts: readonly ClubPart[]; members: readonly ClubMember[] };
export type MemberRoleChange = { member: ClubMember; role: ClubMemberRole };
export type MemberRoleOutcome = { kind: 'board'; board: ClubMembersBoard } | { kind: 'access-changed' };
export type ClubMembersService = { getBoard: (id: string) => Promise<ClubMembersBoard>; changeRole: (id: string, action: MemberRoleChange) => Promise<MemberRoleOutcome>; removeMember: (id: string, member: ClubMember) => Promise<MemberRoleOutcome> };
export class ClubMembersError extends Error {
  constructor(readonly reason: 'invalid' | 'forbidden' | 'changed' | 'last-manager' | 'uncertain' | 'storage') { super(`Club members ${reason}`); this.name = 'ClubMembersError'; }
}
