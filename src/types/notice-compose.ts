import type { JoinedClub, Notice, NoticeCategory } from './notice';

export const notificationStates = ['NONE', 'PENDING', 'SENT', 'FAILED'] as const;
export type NotificationState = typeof notificationStates[number];
export type PublishedNotice = Notice & { readonly notificationState: NotificationState };
export type NoticeCreateInput = {
  readonly categoryId: string;
  readonly subcategoryId?: string;
  readonly title: string;
  readonly body: string;
  readonly pinned: boolean;
  readonly notify: boolean;
};
export type NoticeCreateStatus = { kind: 'ready' } | { kind: 'uncertain' } | { kind: 'created'; notice: PublishedNotice };
export type NoticeComposeBoard = { club: JoinedClub; categories: readonly NoticeCategory[]; status: NoticeCreateStatus };
export type NoticeComposeStore = { get: (clubId: string) => Promise<string | null>; set: (clubId: string, value: string | null) => Promise<void> };
export type NoticeComposeService = {
  getBoard: (clubId: string) => Promise<NoticeComposeBoard>;
  create: (clubId: string, input: NoticeCreateInput) => Promise<PublishedNotice>;
  reset: (clubId: string) => Promise<void>;
};
export class NoticeComposeError extends Error {
  constructor(readonly reason: 'invalid' | 'category-changed' | 'forbidden' | 'not-found' | 'storage' | 'uncertain' | 'already-created') {
    super(`Notice compose ${reason}`);
    this.name = 'NoticeComposeError';
  }
}
