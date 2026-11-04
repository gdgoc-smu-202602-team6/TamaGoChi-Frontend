import { ApiError } from './api/http-client';
import { GuestbookError, type GuestbookService, type GuestbookIntentStore, type GuestbookPage, type GuestbookTarget } from '../types/guestbook';
import { guestbookScope, guestbookText, sameGuestbookEntry } from '../utils/guestbook';

type Journal = { version: 1; intentId: string; kind: 'pending' | 'created' };
export function createGuestbookService(backend: Omit<GuestbookService, 'getPage' | 'resetIntent' | 'remove'> & { getPage: (target: GuestbookTarget, token?: string) => Promise<GuestbookPage>; remove: GuestbookService['remove']; context: (target: GuestbookTarget) => Promise<GuestbookPage> }, store: GuestbookIntentStore): GuestbookService {
  let queue: Promise<unknown> = Promise.resolve();
  const confirmed = new Map<string, string>();
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  async function journal(target: GuestbookTarget): Promise<Journal | null> {
    try { const raw = await store.get(guestbookScope(target)); if (raw === null) return null; const value = JSON.parse(raw); if (!value || value.version !== 1 || !['pending', 'created'].includes(value.kind) || typeof value.intentId !== 'string' || !value.intentId) throw new Error(); return value; }
    catch { throw new GuestbookError('storage'); }
  }
  async function save(target: GuestbookTarget, value: Journal | null) { try { await store.set(guestbookScope(target), value ? JSON.stringify(value) : null); } catch { throw new GuestbookError('storage'); } }
  async function find(target: GuestbookTarget, id: string) {
    const tokens = new Set<string>(), entries = new Set<string>(); let token: string | undefined;
    do { const page = await backend.getPage(target, token); for (const entry of page.items) { if (entries.has(entry.id)) throw new ApiError('response'); entries.add(entry.id); if (entry.id === id) return entry; } token = page.nextPageToken; if (token && tokens.has(token)) throw new ApiError('response'); if (token) tokens.add(token); } while (token);
    return null;
  }
  return {
    async getPage(target, token) { const page = await backend.getPage(target, token), value = target.kind === 'mine' ? null : await journal(target); return { ...page, createStatus: !value ? 'ready' : value.kind === 'created' || confirmed.get(guestbookScope(target)) === value.intentId ? 'created' : 'uncertain' }; },
    create: (target, ownerId, text) => serial(async () => {
      const body = guestbookText(text), context = await backend.context(target);
      if (!context.canWrite || target.kind === 'mine') throw new GuestbookError('forbidden');
      if (context.ownerId !== ownerId) throw new GuestbookError('changed');
      const previous = await journal(target); if (previous) throw new GuestbookError(previous.kind === 'created' ? 'already-created' : 'uncertain');
      const pending: Journal = { version: 1, kind: 'pending', intentId: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
      await save(target, pending);
      let entry;
      try { entry = await backend.create(target, ownerId, body); }
      catch (error) { if (error instanceof ApiError && error.kind === 'http' && error.status && error.status < 500 && error.status !== 408) { await save(target, null); throw error; } throw new GuestbookError('uncertain'); }
      confirmed.set(guestbookScope(target), pending.intentId);
      try { await save(target, { ...pending, kind: 'created' }); } catch { /* The durable pending record still prevents a duplicate after restart. */ }
      return entry;
    }),
    resetIntent: target => serial(async () => { const context = await backend.context(target); if (!context.canWrite) throw new GuestbookError('forbidden'); await journal(target); await save(target, null); confirmed.delete(guestbookScope(target)); }),
    remove: (target, expected) => serial(async () => {
      const actual = await find(target, expected.id);
      if (!actual) return;
      if (!actual.canDelete) throw new GuestbookError('forbidden');
      if (!sameGuestbookEntry(actual, expected)) throw new GuestbookError('changed');
      try { await backend.remove(target, actual); }
      catch (error) { if (error instanceof ApiError && error.kind === 'http' && error.status && error.status < 500 && ![404, 408].includes(error.status)) throw error; }
      try { if (!(await find(target, expected.id))) return; } catch (error) { if (error instanceof ApiError && (error.kind === 'session' || [401, 403, 404].includes(error.status ?? 0))) throw error; }
      throw new GuestbookError('uncertain');
    }),
    getNewCount: backend.getNewCount, markChecked: at => serial(() => backend.markChecked(at)),
  };
}
