import type { AuthUser } from './auth';
import type { ClubMember } from './club-members';
import type { ClubPart } from './club-join';
import type { JoinedClub } from './notice';

export type ClubPreferences = { club: JoinedClub; member: ClubMember; parts: readonly ClubPart[]; notificationsOn: boolean };
export type ClubPreferencesInput = { partId: string; notificationsOn: boolean };
export type PersonalSettingsService = {
  getAccount: () => Promise<AuthUser>;
  rename: (expected: AuthUser, nickname: string) => Promise<AuthUser>;
  getClub: (clubId: string) => Promise<ClubPreferences>;
  updateClub: (expected: ClubPreferences, input: ClubPreferencesInput) => Promise<ClubPreferences>;
};
export class PersonalSettingsError extends Error {
  constructor(readonly reason: 'invalid' | 'changed' | 'uncertain' | 'storage') { super(`Personal settings ${reason}`); this.name = 'PersonalSettingsError'; }
}
