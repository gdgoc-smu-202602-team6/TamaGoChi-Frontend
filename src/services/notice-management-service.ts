import type { JoinedClub, NoticeCategory } from '../types/notice';
import type { PublishedNotice } from '../types/notice-compose';
import { NoticeManagementError, type NoticeManagementService, type NoticePatch } from '../types/notice-management';
import { checkNoticeCategory } from '../utils/notice-compose';
import { normalizeNoticeEdit, noticeChanges, sameNoticeContent } from '../utils/notice-edit';
import { ApiError } from './api/http-client';
import { ClubAdminError } from '../types/club-admin';

export function createNoticeManagementService(backend: {
  context: (clubId: string) => Promise<{ club: JoinedClub; categories: readonly NoticeCategory[] }>;
  get: (clubId: string, id: string) => Promise<PublishedNotice>;
  update: (clubId: string, id: string, patch: NoticePatch) => Promise<PublishedNotice>;
  remove: (clubId: string, id: string) => Promise<void>;
}): NoticeManagementService {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  async function get(clubId: string, id: string) {
    try { const one = await backend.get(clubId, id); if (one.id !== id) throw new ApiError('response'); return one; }
    catch (error) { if (error instanceof ApiError && error.status === 404) throw new NoticeManagementError('missing'); throw error; }
  }
  async function load(clubId: string, id: string) { const context = await backend.context(clubId); return { ...context, notice: await get(clubId, id) }; }
  const definite = (error: unknown) => error instanceof ApiError && error.kind === 'http' && !!error.status && error.status < 500 && error.status !== 408;
  const accessFailure = (error: unknown) => error instanceof NoticeManagementError || (error instanceof ClubAdminError && ['forbidden', 'not-found'].includes(error.reason))
    || (error instanceof ApiError && [401, 403, 404].includes(error.status ?? 0));
  return {
    getBoard: (clubId, id) => serial(() => load(clubId, id)),
    save: (clubId, id, original, draft) => serial(async () => {
      if (original.id !== id) throw new ApiError('response');
      const normalized = normalizeNoticeEdit(draft), current = await load(clubId, id);
      checkNoticeCategory({ ...normalized, notify: false }, current.categories);
      if (sameNoticeContent(current.notice, normalized)) return current.notice;
      if (!sameNoticeContent(current.notice, original)) throw new NoticeManagementError('changed');
      const patch = noticeChanges(original, normalized);
      try {
        const receipt = await backend.update(clubId, id, patch);
        if (receipt.id !== id || !sameNoticeContent(receipt, normalized)) throw new ApiError('response');
        return receipt;
      } catch (error) {
        if (definite(error)) { if (error instanceof ApiError && error.status === 404) throw new NoticeManagementError('missing'); throw error; }
        let actual;
        try { actual = await load(clubId, id); }
        catch (reason) { if (accessFailure(reason)) throw reason; throw new NoticeManagementError('uncertain'); }
        if (sameNoticeContent(actual.notice, normalized)) return actual.notice;
        throw new NoticeManagementError(sameNoticeContent(actual.notice, original) ? 'uncertain' : 'changed');
      }
    }),
    remove: (clubId, id, original) => serial(async () => {
      if (original.id !== id) throw new ApiError('response');
      let current;
      try { current = await load(clubId, id); }
      catch (error) { if (error instanceof NoticeManagementError && error.reason === 'missing') { await backend.context(clubId); return 'absent'; } throw error; }
      if (!sameNoticeContent(current.notice, original)) throw new NoticeManagementError('changed');
      try { await backend.remove(clubId, id); return 'deleted'; }
      catch (error) {
        if (error instanceof ApiError && error.status === 404) { await backend.context(clubId); return 'absent'; }
        if (definite(error)) throw error;
        let actual;
        try { actual = await load(clubId, id); }
        catch (reason) {
          if (reason instanceof NoticeManagementError && reason.reason === 'missing') { await backend.context(clubId); return 'absent'; }
          if (accessFailure(reason)) throw reason;
          throw new NoticeManagementError('uncertain');
        }
        throw new NoticeManagementError(sameNoticeContent(actual.notice, original) ? 'uncertain' : 'changed');
      }
    }),
  };
}
