import type { JoinedClub, NoticeCategory } from './notice';
import type { NoticeCreateInput, PublishedNotice } from './notice-compose';

export type NoticeEditInput = Omit<NoticeCreateInput, 'notify'>;
export type NoticePatch = Partial<Omit<NoticeEditInput, 'subcategoryId'>> & { subcategoryId?: string | null };
export type NoticeEditBoard = { club: JoinedClub; categories: readonly NoticeCategory[]; notice: PublishedNotice };
export type NoticeRemoval = 'deleted' | 'absent';
export type NoticeManagementService = {
  getBoard: (clubId: string, noticeId: string) => Promise<NoticeEditBoard>;
  save: (clubId: string, noticeId: string, original: PublishedNotice, draft: NoticeEditInput) => Promise<PublishedNotice>;
  remove: (clubId: string, noticeId: string, original: PublishedNotice) => Promise<NoticeRemoval>;
};
export class NoticeManagementError extends Error {
  constructor(readonly reason: 'forbidden' | 'missing' | 'changed' | 'uncertain') {
    super(`Notice management ${reason}`);
    this.name = 'NoticeManagementError';
  }
}
