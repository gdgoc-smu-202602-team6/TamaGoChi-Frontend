import { paletteColors, type JoinedClub, type Notice, type NoticeCategory, type NoticeFilter, type NoticePage, type NoticeService } from '../../types/notice';
import { isDateTime, isSessionId as isId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('response');
  return value as Record<string, unknown>;
}
function page(value: unknown): { items: unknown[]; nextPageToken?: string } {
  const data = object(value);
  if (!Array.isArray(data.items) || (data.nextPageToken !== undefined && (typeof data.nextPageToken !== 'string' || !data.nextPageToken))) throw new ApiError('response');
  return data as { items: unknown[]; nextPageToken?: string };
}
function identifier(value: unknown): string { if (!isId(value)) throw new ApiError('response'); return value; }
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) throw new ApiError('response'); return value; }
function clubPath(clubId: string) { return `/clubs/${identifier(clubId)}`; }
export function parseNotice(value: unknown): Notice {
  const data = object(value);
  identifier(data.id); identifier(data.categoryId);
  if (data.subcategoryId !== undefined) identifier(data.subcategoryId);
  if (data.authorUserId != null) text(data.authorUserId);
  text(data.title); text(data.body);
  if (typeof data.read !== 'boolean' || typeof data.pinned !== 'boolean' || !isDateTime(data.createdAt)) throw new ApiError('response');
  return data as Notice;
}
function noticePage(value: unknown): NoticePage {
  const data = page(value), entries = data.items.map(parseNotice);
  if (new Set(entries.map(one => one.id)).size !== entries.length) throw new ApiError('response');
  return { items: entries, nextPageToken: data.nextPageToken };
}
export function parseNoticeCategories(value: unknown): NoticeCategory[] {
  const entries = page(value).items.map(value => {
    const data = object(value); identifier(data.id); text(data.name);
    if (!paletteColors.includes(data.color as NoticeCategory['color']) || !Array.isArray(data.subcategories)) throw new ApiError('response');
    const subcategories = data.subcategories.map(value => { const one = object(value); return { id: identifier(one.id), name: text(one.name) }; });
    if (new Set(subcategories.map(one => one.id)).size !== subcategories.length) throw new ApiError('response');
    return { id: data.id as string, name: data.name as string, color: data.color as NoticeCategory['color'], subcategories };
  });
  if (new Set(entries.map(one => one.id)).size !== entries.length) throw new ApiError('response');
  return entries;
}
function query(filter: NoticeFilter, pageToken?: string): string {
  const params = new URLSearchParams({ pageSize: '50' });
  if (filter.categoryId) params.set('categoryId', identifier(filter.categoryId));
  if (filter.subcategoryId) { if (!filter.categoryId) throw new ApiError('response'); params.set('subcategoryId', identifier(filter.subcategoryId)); }
  if (pageToken) params.set('pageToken', pageToken);
  return params.toString();
}

export function createApiNoticeService(client: HttpClient): NoticeService {
  // Complete membership/author lists; never truncate a user's clubs at the first page.
  async function allPages(path: string): Promise<unknown[]> {
    const result: unknown[] = [], seen = new Set<string>();
    let token: string | undefined;
    do {
      const response = await client.request(`${path}${path.includes('?') ? '&' : '?'}pageSize=200${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
      const data = page(response.data); result.push(...data.items); token = data.nextPageToken;
      if (token && seen.has(token)) throw new ApiError('response');
      if (token) seen.add(token);
    } while (token);
    return result;
  }
  const getUnreadCount = async (clubId: string) => {
    const response = await client.request(`${clubPath(clubId)}/notices?read=false&totalSize=true&pageSize=0`), data = object(response.data);
    if (!Number.isSafeInteger(data.totalSize) || (data.totalSize as number) < 0) throw new ApiError('response');
    return data.totalSize as number;
  };
  const listNotices = async (clubId: string, filter: NoticeFilter, token?: string) => noticePage((await client.request(`${clubPath(clubId)}/notices?${query(filter, token)}`)).data);
  return {
    async listMyClubs() {
      const memberships = await allPages('/clubs/-/members?userId=me');
      const ids = [...new Set(memberships.map(value => identifier(object(value).clubId)))];
      // Avoid an unbounded fan-out for users with many memberships.
      const clubs: JoinedClub[] = [];
      for (const id of ids) {
        try {
          const data = object((await client.request(clubPath(id))).data);
          if (identifier(data.id) !== id || !Number.isSafeInteger(data.memberCount) || (data.memberCount as number) < 0) throw new ApiError('response');
          clubs.push({ id, name: text(data.name), memberCount: data.memberCount as number });
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 404)) throw error; // Membership was removed while listing.
        }
      }
      return clubs;
    },
    async getBoard(clubId, filter) {
      const [categoryResponse, members, unreadCount, firstPage] = await Promise.all([
        client.request(`${clubPath(clubId)}/noticeCategories`), allPages(`${clubPath(clubId)}/members`), getUnreadCount(clubId), listNotices(clubId, filter),
      ]);
      const authors = Object.create(null) as Record<string, string>;
      for (const value of members) { const member = object(value); if (identifier(member.clubId) !== clubId) throw new ApiError('response'); authors[text(member.userId)] = text(member.nickname); }
      return { categories: parseNoticeCategories(categoryResponse.data), authors, unreadCount, page: firstPage };
    },
    listNotices,
    async getNotice(clubId, noticeId) {
      const notice = parseNotice((await client.request(`${clubPath(clubId)}/notices/${identifier(noticeId)}`)).data);
      if (notice.id !== noticeId) throw new ApiError('response');
      return notice;
    },
    async markRead(clubId, noticeId) { await client.request(`${clubPath(clubId)}/notices/${identifier(noticeId)}/reads/me`, { method: 'PUT' }); },
    getUnreadCount,
  };
}
