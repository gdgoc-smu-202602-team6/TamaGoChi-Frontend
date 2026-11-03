import type { ClubMember } from './club-members';
import type { JoinedClub } from './notice';

export type OwnClubMembership = { club: JoinedClub; member: ClubMember };
export type MembershipState = { kind: 'absent' } | { kind: 'member'; data: OwnClubMembership };
export type ClubMembershipService = { getState: (id: string) => Promise<MembershipState>; leave: (id: string, expected: ClubMember) => Promise<MembershipState> };
export class ClubMembershipError extends Error {
  constructor(readonly reason: 'invalid' | 'changed' | 'last-manager' | 'uncertain' | 'storage') { super(`Club membership ${reason}`); this.name = 'ClubMembershipError'; }
}
