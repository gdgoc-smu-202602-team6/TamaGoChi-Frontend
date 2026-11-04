export type GuestbookTarget = { kind: 'mine' } | { kind: 'member'; clubId: string; memberId: string };
export type GuestbookEntry = { id: string; clubId: string; userId: string; authorUserId: string | null; body: string; createdAt: string; new?: boolean };
export type GuestbookRow = GuestbookEntry & { authorName: string; clubName: string; canDelete: boolean; authorMemberId?: string };
export type GuestbookContext = { ownerId: string; ownerName: string; canWrite: boolean };
export type GuestbookPage = GuestbookContext & { items: readonly GuestbookRow[]; nextPageToken?: string };
export type GuestbookCreateStatus = 'ready' | 'uncertain' | 'created';
export type GuestbookBoard = GuestbookPage & { createStatus: GuestbookCreateStatus };
export type GuestbookIntentStore = { get: (scope: string) => Promise<string | null>; set: (scope: string, value: string | null) => Promise<void> };
export type GuestbookService = {
  getPage: (target: GuestbookTarget, token?: string) => Promise<GuestbookBoard>;
  create: (target: GuestbookTarget, ownerId: string, text: string) => Promise<GuestbookEntry>;
  resetIntent: (target: GuestbookTarget) => Promise<void>;
  remove: (target: GuestbookTarget, entry: GuestbookEntry) => Promise<void>;
  getNewCount: () => Promise<number>;
  markChecked: (at: string) => Promise<void>;
};
export class GuestbookError extends Error {
  constructor(readonly reason: 'invalid' | 'changed' | 'forbidden' | 'storage' | 'uncertain' | 'already-created') { super(`Guestbook ${reason}`); this.name = 'GuestbookError'; }
}
