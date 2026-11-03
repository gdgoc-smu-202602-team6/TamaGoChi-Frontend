import type { JoinedClub } from './notice';

export type ClubSettings = JoinedClub & { inviteCode: string; createdAt: string; etag?: string };
export type ClubSettingsAction = { kind: 'rename'; name: string; expected: ClubSettings } | { kind: 'rotate'; expected: ClubSettings };
export type ClubSettingsService = { get: (clubId: string) => Promise<ClubSettings>; mutate: (clubId: string, action: ClubSettingsAction) => Promise<ClubSettings> };
export class ClubSettingsError extends Error {
  constructor(readonly reason: 'invalid' | 'forbidden' | 'changed' | 'uncertain' | 'storage') { super(`Club settings ${reason}`); this.name = 'ClubSettingsError'; }
}
