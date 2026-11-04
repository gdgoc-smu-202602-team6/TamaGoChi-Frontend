import { ApiError } from '../services/api/http-client';
import { createGuestbookService } from '../services/guestbook-service';
import { GuestbookError, type GuestbookEntry, type GuestbookIntentStore, type GuestbookTarget } from '../types/guestbook';
import { guestbookScope } from '../utils/guestbook';
import { getMockMembers } from './club-members-data';
import { joinedMockClubs } from './clubs';
import { mockClubCatalog, type MockApplicationStore } from './club-data';

export const MOCK_GUESTBOOK_KEY = '@tamagochi/mock-guestbook/v1';
type Registry = { version: 1; entries: GuestbookEntry[]; deletedIds: string[]; checkedAt: string | null };
const locks = new WeakMap<object, Promise<unknown>>();
const seeds: GuestbookEntry[] = [
  { id: 'mock-gb-my-study', clubId: 'mock-club-study', userId: 'mock-me', authorUserId: 'mock-user-1', body: '오늘도 함께 공부해요!', createdAt: '2026-11-03T03:00:00Z' },
  { id: 'mock-gb-my-pixel', clubId: 'mock-club-pixel', userId: 'mock-me', authorUserId: 'mock-user-2', body: '모리의 방이 멋져요.', createdAt: '2026-11-03T02:00:00Z' },
  { id: 'mock-gb-my-old', clubId: 'mock-club-forest', userId: 'mock-me', authorUserId: null, body: '작은 응원을 남기고 가요.', createdAt: '2026-11-02T03:00:00Z' },
  ...mockClubCatalog.flatMap(club => Array.from({ length: club.memberCount - (club.id === 'mock-club-forest' ? 0 : 1) }, (_, i) => ({ id: `mock-gb-${club.id}-${i + 1}`, clubId: club.id, userId: `mock-user-${i + 1}`, authorUserId: `mock-user-${i === 0 ? 2 : 1}`, body: '차근차근 함께 성장해요!', createdAt: '2026-11-03T01:00:00Z' }))),
];
export function createMockGuestbookService(storage: MockApplicationStore, store: GuestbookIntentStore, now = Date.now) {
  const serial = <T>(work: () => Promise<T>) => { const task = (locks.get(storage) ?? Promise.resolve()).then(work); locks.set(storage, task.catch(() => undefined)); return task; };
  async function read(): Promise<Registry> {
    try { const raw = await storage.getItem(MOCK_GUESTBOOK_KEY); if (raw === null) return { version: 1, entries: [], deletedIds: [], checkedAt: null }; const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !Array.isArray(data.entries) || !Array.isArray(data.deletedIds) || !data.deletedIds.every((id: unknown) => typeof id === 'string' && !!id) || new Set(data.deletedIds).size !== data.deletedIds.length || (data.checkedAt !== null && (typeof data.checkedAt !== 'string' || !Number.isFinite(Date.parse(data.checkedAt))))
        || !data.entries.every((entry: GuestbookEntry) => entry && [entry.id, entry.clubId, entry.userId, entry.body, entry.createdAt].every(value => typeof value === 'string' && !!value) && (entry.authorUserId === null || typeof entry.authorUserId === 'string') && Number.isFinite(Date.parse(entry.createdAt))) || new Set([...seeds, ...data.entries].map(one => one.id)).size !== seeds.length + data.entries.length) throw new Error(); return data;
    } catch { throw new GuestbookError('storage'); }
  }
  async function save(value: Registry) { try { await storage.setItem(MOCK_GUESTBOOK_KEY, JSON.stringify(value)); } catch { throw new GuestbookError('storage'); } }
  async function context(target: GuestbookTarget) {
    const clubs = await joinedMockClubs(storage);
    if (target.kind === 'mine') return { ownerId: 'mock-me', ownerName: '내 방', canWrite: false, clubs };
    const club = clubs.find(one => one.id === target.clubId); if (!club) throw new ApiError('http', 404);
    const owner = (await getMockMembers(storage, target.clubId)).find(one => one.id === target.memberId); if (!owner) throw new ApiError('http', 404);
    return { ownerId: owner.userId, ownerName: `${owner.nickname}의 방`, canWrite: owner.userId !== 'mock-me', clubs };
  }
  const entries = (registry: Registry) => [...seeds, ...registry.entries].filter(one => !registry.deletedIds.includes(one.id));
  async function getPage(target: GuestbookTarget, token?: string) {
    const state = await context(target), registry = await read(), prefix = `guestbook:${guestbookScope(target)}:`, offset = token === undefined ? 0 : token.startsWith(prefix) ? Number(token.slice(prefix.length)) : NaN;
    if (!Number.isSafeInteger(offset) || offset < 0) throw new ApiError('response');
    const all = entries(registry).filter(one => one.userId === state.ownerId && (target.kind === 'mine' || one.clubId === target.clubId)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), part = all.slice(offset, offset + 20);
    const rosters = new Map(await Promise.all(state.clubs.map(async club => [club.id, await getMockMembers(storage, club.id)] as const)));
    return { ownerId: state.ownerId, ownerName: state.ownerName, canWrite: state.canWrite, items: part.map(entry => { const author = rosters.get(entry.clubId)?.find(one => one.userId === entry.authorUserId); return { ...entry, ...(state.ownerId === 'mock-me' ? { new: !registry.checkedAt || Date.parse(entry.createdAt) > Date.parse(registry.checkedAt) } : {}), authorName: entry.authorUserId === null ? '탈퇴한 사용자' : entry.authorUserId === 'mock-me' ? '나' : author?.nickname ?? '작성자 정보 없음', clubName: state.clubs.find(one => one.id === entry.clubId)?.name ?? '동아리 정보 없음', canDelete: rosters.has(entry.clubId) && (entry.userId === 'mock-me' || entry.authorUserId === 'mock-me'), ...(author && author.userId !== 'mock-me' ? { authorMemberId: author.id } : {}) }; }), ...(offset + 20 < all.length ? { nextPageToken: `${prefix}${offset + 20}` } : {}) };
  }
  return createGuestbookService({
    getPage, context: async target => ({ ...await context(target), items: [] }),
    create: (target, ownerId, body) => serial(async () => { const state = await context(target); if (target.kind === 'mine' || !state.canWrite) throw new ApiError('http', 400); if (ownerId !== state.ownerId) throw new GuestbookError('changed'); const registry = await read(), entry = { id: `mock-gb-${now()}-${Math.random().toString(36).slice(2)}`, clubId: target.clubId, userId: ownerId, authorUserId: 'mock-me', body, createdAt: new Date(now()).toISOString() }; await save({ ...registry, entries: [...registry.entries, entry] }); return entry; }),
    remove: (target, expected) => serial(async () => { await context(target); const registry = await read(), entry = entries(registry).find(one => one.id === expected.id); if (!entry) return; if (entry.userId !== 'mock-me' && entry.authorUserId !== 'mock-me') throw new ApiError('http', 403); if (!(await joinedMockClubs(storage)).some(one => one.id === entry.clubId)) throw new ApiError('http', 403); await save({ ...registry, deletedIds: [...registry.deletedIds, entry.id] }); }),
    getNewCount: async () => { const registry = await read(); return entries(registry).filter(one => one.userId === 'mock-me' && (!registry.checkedAt || Date.parse(one.createdAt) > Date.parse(registry.checkedAt))).length; },
    markChecked: at => serial(async () => { if (!Number.isFinite(Date.parse(at))) throw new GuestbookError('invalid'); const registry = await read(); await save({ ...registry, checkedAt: new Date(Math.min(Date.parse(at), now())).toISOString() }); }),
  }, store);
}
