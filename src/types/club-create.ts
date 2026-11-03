import type { JoinedClub, PaletteColor } from './notice';

export type ClubCreateInput = {
  readonly name: string;
  readonly parts: readonly { name: string; color: PaletteColor }[];
  readonly myPartName: string;
};
export type CreatedClub = JoinedClub & { readonly createdAt: string; readonly inviteCode?: string };
export type ClubCreateStatus = { kind: 'ready' } | { kind: 'uncertain' } | { kind: 'created'; club: CreatedClub };
export type ClubCreateStore = { get: () => Promise<string | null>; set: (value: string | null) => Promise<void> };
export type ClubCreateService = {
  getStatus: () => Promise<ClubCreateStatus>;
  create: (input: ClubCreateInput) => Promise<CreatedClub>;
  reset: () => Promise<void>;
};
export class ClubCreateError extends Error {
  constructor(readonly reason: 'invalid-input' | 'storage' | 'uncertain' | 'already-created') {
    super(`Club create ${reason}`);
    this.name = 'ClubCreateError';
  }
}
