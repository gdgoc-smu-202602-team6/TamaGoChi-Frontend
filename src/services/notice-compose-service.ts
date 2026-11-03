import type { JoinedClub, NoticeCategory } from '../types/notice';
import { NoticeComposeError, type NoticeComposeService, type NoticeComposeStore, type NoticeCreateInput, type NoticeCreateStatus, type PublishedNotice } from '../types/notice-compose';
import { checkNoticeCategory, normalizeNoticeCreate } from '../utils/notice-compose';
import { ApiError } from './api/http-client';

type Journal = { version: 1; kind: 'pending'; intentId?: string } | { version: 1; kind: 'created'; noticeId: string };
export function createGuardedNoticeComposeService(store: NoticeComposeStore, backend: {
  context: (clubId: string) => Promise<{ club: JoinedClub; categories: readonly NoticeCategory[] }>;
  create: (clubId: string, input: NoticeCreateInput) => Promise<PublishedNotice>;
  get: (clubId: string, id: string) => Promise<PublishedNotice>;
}): NoticeComposeService {
  let queue: Promise<unknown> = Promise.resolve();
  const confirmed = new Map<string, { intentId: string; noticeId: string }>();
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  async function read(clubId: string): Promise<Journal | null> {
    try {
      const raw = await store.get(clubId);
      if (raw === null) return null;
      const value = JSON.parse(raw);
      if (!value || value.version !== 1 || !['pending', 'created'].includes(value.kind)
        || (value.kind === 'pending' && value.intentId !== undefined && (typeof value.intentId !== 'string' || !value.intentId))
        || (value.kind === 'created' && (typeof value.noticeId !== 'string' || !value.noticeId))) throw new Error();
      return value;
    } catch { throw new NoticeComposeError('storage'); }
  }
  async function write(clubId: string, journal: Journal | null) {
    try { await store.set(clubId, journal ? JSON.stringify(journal) : null); }
    catch { throw new NoticeComposeError('storage'); }
  }
  return {
    getBoard: clubId => serial(async () => {
      const context = await backend.context(clubId), journal = await read(clubId);
      let status: NoticeCreateStatus = { kind: 'ready' };
      if (journal) {
        const receipt = confirmed.get(clubId);
        const id = journal.kind === 'created' ? journal.noticeId : receipt?.intentId === journal.intentId ? receipt?.noticeId : undefined;
        if (!id) status = { kind: 'uncertain' };
        else {
          try { status = { kind: 'created', notice: await backend.get(clubId, id) }; }
          catch (error) { if (error instanceof ApiError && error.status === 404) status = { kind: 'uncertain' }; else throw error; }
        }
      }
      return { ...context, status };
    }),
    create: (clubId, input) => serial(async () => {
      const normalized = normalizeNoticeCreate(input), context = await backend.context(clubId);
      checkNoticeCategory(normalized, context.categories);
      const journal = await read(clubId);
      if (journal) throw new NoticeComposeError(journal.kind === 'pending' ? 'uncertain' : 'already-created');
      // Correlate an in-memory receipt only with this intent, including across other open tabs.
      const intentId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await write(clubId, { version: 1, kind: 'pending', intentId });
      let notice: PublishedNotice;
      try { notice = await backend.create(clubId, normalized); }
      catch (error) {
        if (error instanceof ApiError && error.kind === 'http' && [400, 401, 403, 404, 422].includes(error.status ?? 0)) {
          await write(clubId, null); throw error;
        }
        throw new NoticeComposeError('uncertain');
      }
      confirmed.set(clubId, { intentId, noticeId: notice.id });
      try { await write(clubId, { version: 1, kind: 'created', noticeId: notice.id }); }
      catch { /* A durable pending record still prevents an automatic repeat after restart. */ }
      return notice;
    }),
    reset: clubId => serial(async () => { await backend.context(clubId); await read(clubId); await write(clubId, null); confirmed.delete(clubId); }),
  };
}
