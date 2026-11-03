import type { ClubPart } from './club-join';
import type { JoinedClub, PaletteColor } from './notice';

export type ClubPartsBoard = { club: JoinedClub; parts: readonly ClubPart[] };
export type ClubPartAction = { kind: 'add'; name: string; color: PaletteColor } | { kind: 'delete'; part: ClubPart };
export type ClubPartsService = { getBoard: (clubId: string) => Promise<ClubPartsBoard>; mutate: (clubId: string, action: ClubPartAction) => Promise<ClubPartsBoard> };
export class ClubPartsError extends Error {
  constructor(readonly reason: 'invalid' | 'forbidden' | 'duplicate' | 'in-use' | 'changed' | 'uncertain' | 'storage') { super(`Club parts ${reason}`); this.name = 'ClubPartsError'; }
}
