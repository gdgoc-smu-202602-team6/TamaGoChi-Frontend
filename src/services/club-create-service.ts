import { ClubCreateError, type ClubCreateInput, type ClubCreateService, type ClubCreateStore, type CreatedClub } from '../types/club-create';
import { normalizeClubCreate } from '../utils/club-create';
import { ApiError } from './api/http-client';

type Journal = { version: 1; kind: 'pending' } | { version: 1; kind: 'created'; clubId: string };

// POST /clubs has no idempotency key. Record intent before sending and never replay it automatically.
export function createGuardedClubCreateService(store: ClubCreateStore, backend: {
  create: (input: ClubCreateInput) => Promise<CreatedClub>;
  get: (id: string) => Promise<CreatedClub>;
}): ClubCreateService {
  let journal: Journal | null = null, loaded = false, queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  async function load() {
    if (loaded) return;
    try {
      const raw = await store.get();
      if (raw !== null) {
        const value = JSON.parse(raw);
        if (!value || value.version !== 1 || !['pending', 'created'].includes(value.kind)
          || (value.kind === 'created' && (typeof value.clubId !== 'string' || !value.clubId))) throw new Error();
        journal = value;
      }
      loaded = true;
    } catch { throw new ClubCreateError('storage'); }
  }
  async function clear() {
    try { await store.set(null); } catch { throw new ClubCreateError('storage'); }
    journal = null;
  }
  return {
    getStatus: () => serial(async () => {
      await load();
      if (!journal) return { kind: 'ready' };
      if (journal.kind === 'pending') return { kind: 'uncertain' };
      const club = await backend.get(journal.clubId);
      if (club.id !== journal.clubId) throw new ApiError('response');
      return { kind: 'created', club };
    }),
    create: input => serial(async () => {
      const normalized = normalizeClubCreate(input);
      await load();
      if (journal) throw new ClubCreateError(journal.kind === 'pending' ? 'uncertain' : 'already-created');
      const pending: Journal = { version: 1, kind: 'pending' };
      try { await store.set(JSON.stringify(pending)); } catch { throw new ClubCreateError('storage'); }
      journal = pending;
      let club: CreatedClub;
      try { club = await backend.create(normalized); }
      catch (error) {
        // Only definite request rejections allow another submission without an explicit reset.
        if (error instanceof ApiError && error.kind === 'http' && [400, 401, 403, 404, 422].includes(error.status ?? 0)) {
          await clear(); throw error;
        }
        throw new ClubCreateError('uncertain');
      }
      journal = { version: 1, kind: 'created', clubId: club.id };
      try { await store.set(JSON.stringify(journal)); } catch { /* The durable pending intent still prevents replay after a restart. */ }
      return club;
    }),
    reset: () => serial(async () => { await load(); await clear(); }),
  };
}
