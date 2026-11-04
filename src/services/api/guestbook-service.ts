import { createGuestbookService } from '../guestbook-service';
import type { GuestbookEntry, GuestbookIntentStore, GuestbookPage, GuestbookTarget } from '../../types/guestbook';
import type { ClubMember } from '../../types/club-members';
import { guestbookText } from '../../utils/guestbook';
import { parseClubMember } from './club-members-service';
import { isDateTime, isSessionId as isId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('response'); return value as Record<string, unknown>; }
function page(value: unknown) { const data = object(value); if (!Array.isArray(data.items) || (data.nextPageToken !== undefined && (typeof data.nextPageToken !== 'string' || !data.nextPageToken))) throw new ApiError('response'); return data as { items: unknown[]; nextPageToken?: string }; }
export function parseGuestbookEntry(value: unknown, ownerId: string, clubId?: string): GuestbookEntry {
  const data = object(value);
  if (!isId(data.id) || !isId(data.clubId) || data.userId !== ownerId || (clubId && data.clubId !== clubId) || (data.authorUserId !== null && (typeof data.authorUserId !== 'string' || !data.authorUserId)) || typeof data.body !== 'string' || !isDateTime(data.createdAt) || (data.new !== undefined && typeof data.new !== 'boolean')) throw new ApiError('response');
  try { guestbookText(data.body); } catch { throw new ApiError('response'); }
  return { id: data.id, clubId: data.clubId, userId: ownerId, authorUserId: data.authorUserId as string | null, body: data.body, createdAt: data.createdAt, ...(data.new === undefined ? {} : { new: data.new as boolean }) };
}
export function createApiGuestbookService(client: HttpClient, userId: string, store: GuestbookIntentStore) {
  const base = (target: GuestbookTarget) => { if (target.kind === 'mine') return '/users/me/guestbookEntries'; if (!isId(target.clubId) || !isId(target.memberId)) throw new ApiError('response'); return `/clubs/${target.clubId}/members/${target.memberId}/guestbookEntries`; };
  async function allMembers(path: string, clubId?: string) {
    const members: ClubMember[] = [], tokens = new Set<string>(); let token: string | undefined;
    do { const data = page((await client.request(`${path}${path.includes('?') ? '&' : '?'}pageSize=200${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`)).data); for (const value of data.items) { const one = object(value), id = clubId ?? one.clubId; if (!isId(id)) throw new ApiError('response'); const member = parseClubMember(value, id); if (!clubId && member.userId !== userId) throw new ApiError('response'); members.push(member); } token = data.nextPageToken; if (token && tokens.has(token)) throw new ApiError('response'); if (token) tokens.add(token); } while (token);
    if (new Set(members.map(one => one.id)).size !== members.length || (clubId && new Set(members.map(one => one.userId)).size !== members.length) || (!clubId && new Set(members.map(one => one.clubId)).size !== members.length)) throw new ApiError('response');
    return members;
  }
  async function context(target: GuestbookTarget) {
    base(target);
    if (target.kind === 'mine') return { ownerId: userId, ownerName: '내 방', canWrite: false, memberships: await allMembers('/clubs/-/members?userId=me') };
    const me = parseClubMember((await client.request(`/clubs/${target.clubId}/members/me`)).data, target.clubId);
    if (me.userId !== userId) throw new ApiError('response');
    const owner = parseClubMember((await client.request(`/clubs/${target.clubId}/members/${target.memberId}`)).data, target.clubId);
    if (owner.id !== target.memberId) throw new ApiError('response');
    return { ownerId: owner.userId, ownerName: `${owner.nickname || '닉네임 정보 없음'}의 방`, canWrite: owner.userId !== userId, memberships: [me] };
  }
  async function getPage(target: GuestbookTarget, token?: string): Promise<GuestbookPage> {
    const state = await context(target), data = page((await client.request(`${base(target)}?pageSize=20${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`)).data), entries = data.items.map(one => parseGuestbookEntry(one, state.ownerId, target.kind === 'member' ? target.clubId : undefined));
    if (new Set(entries.map(one => one.id)).size !== entries.length) throw new ApiError('response');
    const labels = new Map<string, { name: string; members: ClubMember[] }>();
    await Promise.all([...new Set(entries.map(one => one.clubId))].filter(id => state.memberships.some(one => one.clubId === id)).map(async id => {
      try { const [club, members] = await Promise.all([client.request(`/clubs/${id}`), allMembers(`/clubs/${id}/members`, id)]), info = object(club.data); if (info.id !== id || typeof info.name !== 'string' || !info.name.trim()) throw new ApiError('response'); labels.set(id, { name: info.name, members }); }
      catch (error) { if (!(error instanceof ApiError && [403, 404].includes(error.status ?? 0))) throw error; }
    }));
    return { ownerId: state.ownerId, ownerName: state.ownerName, canWrite: state.canWrite, items: entries.map(entry => { const group = labels.get(entry.clubId), author = group?.members.find(one => one.userId === entry.authorUserId), current = state.memberships.some(one => one.clubId === entry.clubId); return { ...entry, authorName: entry.authorUserId === null ? '탈퇴한 사용자' : entry.authorUserId === userId ? '나' : author?.nickname || '작성자 정보 없음', clubName: group?.name ?? '동아리 정보 없음', canDelete: current && (entry.userId === userId || entry.authorUserId === userId), ...(author && author.userId !== userId ? { authorMemberId: author.id } : {}) }; }), ...(data.nextPageToken ? { nextPageToken: data.nextPageToken } : {}) };
  }
  async function newCount(value: unknown) { const data = object(value); if (data.userId !== userId || !Number.isSafeInteger(data.newGuestbookCount) || (data.newGuestbookCount as number) < 0) throw new ApiError('response'); return data.newGuestbookCount as number; }
  return createGuestbookService({
    getPage, context: async target => ({ ...await context(target), items: [] }),
    async create(target, ownerId, body) { if (target.kind === 'mine' || ownerId === userId) throw new ApiError('http', 400); const entry = parseGuestbookEntry((await client.request(base(target), { method: 'POST', body: { body } })).data, ownerId, target.clubId); if (entry.authorUserId !== userId || entry.body !== body) throw new ApiError('response'); return entry; },
    async remove(target, entry) { if (!isId(entry.id)) throw new ApiError('response'); let endpoint = base(target); if (target.kind === 'mine') { const own = (await context(target)).memberships.find(one => one.clubId === entry.clubId); if (!own) throw new ApiError('http', 403); endpoint = `/clubs/${entry.clubId}/members/${own.id}/guestbookEntries`; } await client.request(`${endpoint}/${entry.id}`, { method: 'DELETE' }); },
    getNewCount: async () => newCount((await client.request('/users/me/room')).data),
    async markChecked(at) { if (!isDateTime(at)) throw new ApiError('response'); await newCount((await client.request('/users/me/room', { method: 'PATCH', body: { guestbookCheckedAt: at } })).data); },
  }, store);
}
