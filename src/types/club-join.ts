import type { JoinedClub, PaletteColor } from './notice';

export type ClubPart = { readonly id: string; readonly name: string; readonly color: PaletteColor };
export type ClubPreview = JoinedClub & { readonly parts: readonly ClubPart[] };
export type ClubApplication = {
  readonly id: string; readonly clubId: string; readonly partId: string | null;
  readonly state: 'PENDING' | 'APPROVED' | 'REJECTED'; readonly createdAt: string; readonly decidedAt?: string;
  readonly clubName?: string; readonly partName?: string;
};
export type ClubJoinOverview = { readonly clubs: readonly JoinedClub[]; readonly applications: readonly ClubApplication[] };
export type ClubJoinService = {
  getOverview: () => Promise<ClubJoinOverview>;
  findClub: (inviteCode: string) => Promise<ClubPreview | null>;
  apply: (clubId: string, partId: string) => Promise<ClubApplication>;
  cancel: (clubId: string, applicationId: string) => Promise<'cancelled' | 'missing'>;
};
export type ClubNameStore = { get: () => Promise<string | null>; set: (value: string) => Promise<void> };
export class ClubJoinError extends Error {
  constructor(readonly reason: 'invalid-code' | 'part-missing' | 'already-member' | 'pending' | 'not-pending' | 'not-found' | 'storage') {
    super(`Club join ${reason}`); this.name = 'ClubJoinError';
  }
}
