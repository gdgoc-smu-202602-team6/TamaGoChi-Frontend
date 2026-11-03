import type { ClubApplication, ClubPart } from './club-join';
import type { JoinedClub } from './notice';

export const clubPermissions = ['club.update', 'parts.manage', 'noticeCategories.manage', 'applications.decide', 'members.manage', 'notices.write'] as const;
export type ClubPermission = typeof clubPermissions[number];
export type ApplicationDecision = 'APPROVED' | 'REJECTED';
export type ReviewApplication = ClubApplication & { readonly userId: string; readonly nickname: string; readonly email: string };
export type ClubApplicationBoard = { readonly club: JoinedClub; readonly parts: readonly ClubPart[]; readonly applications: readonly ReviewApplication[] };
export type ClubAdminService = {
  getPermissions: (clubId: string) => Promise<readonly ClubPermission[]>;
  getBoard: (clubId: string) => Promise<ClubApplicationBoard>;
  decide: (clubId: string, applicationId: string, decision: ApplicationDecision) => Promise<ReviewApplication>;
};
export class ClubAdminError extends Error {
  constructor(readonly reason: 'forbidden' | 'not-found' | 'already-member' | 'uncertain' | 'invalid' | 'storage') {
    super(`Club admin ${reason}`); this.name = 'ClubAdminError';
  }
}
