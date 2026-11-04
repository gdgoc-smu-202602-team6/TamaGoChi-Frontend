import { createFriendsService } from '../friends-service';
import type { Friend } from '../../types/friends';
import type { ClubMember } from '../../types/club-members';
import type { ShopItem } from '../../types/shop';
import { roomAppearance } from '../../utils/room-layout';
import { sameMember } from '../../utils/club-members';
import { parseClubMember } from './club-members-service';
import { parseClubParts } from './club-parts-service';
import { parseRoomLayout } from './room-service';
import { parseShopCatalog } from './shop-service';
import { isSessionId as isId, parseStats } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('response'); return value as Record<string, unknown>; }
function identifier(value: unknown): string { if (!isId(value)) throw new ApiError('response'); return value; }
function page(value: unknown) {
  const data = object(value);
  if (!Array.isArray(data.items) || (data.nextPageToken !== undefined && (typeof data.nextPageToken !== 'string' || !data.nextPageToken))) throw new ApiError('response');
  return data as { items: unknown[]; nextPageToken?: string };
}
function friend(member: ClubMember, part: Friend['part'], room: unknown, stats: unknown, items: readonly ShopItem[]): Friend {
  const dto = object(room), full = object(stats), numbers = parseStats(stats);
  if (dto.userId !== member.userId || full.userId !== member.userId || !Number.isSafeInteger(dto.likeCount) || (dto.likeCount as number) < 0 || typeof dto.likedByMe !== 'boolean' || (dto.likedByMe && dto.likeCount === 0)) throw new ApiError('response');
  // Visitors validate equipped items against the catalog; they never request another user's inventory.
  const layout = parseRoomLayout(room, items, items.map(one => one.id), member.userId);
  return { member, part, appearance: roomAppearance({ ...layout, items, ownedItemIds: [] }), condition: layout.condition, level: numbers.level, todaySeconds: numbers.todaySeconds, likeCount: dto.likeCount as number, likedByMe: dto.likedByMe };
}
export function createApiFriendsService(client: HttpClient, userId: string) {
  async function context(id: string) {
    const base = `/clubs/${identifier(id)}`, me = parseClubMember((await client.request(`${base}/members/me`)).data, id);
    if (me.userId !== userId) throw new ApiError('response');
    const [clubResponse, partResponse] = await Promise.all([client.request(base), client.request(`${base}/parts`)]);
    const club = object(clubResponse.data), parts = parseClubParts(partResponse.data);
    if (club.id !== id || typeof club.name !== 'string' || !club.name.trim() || !Number.isSafeInteger(club.memberCount) || (club.memberCount as number) < 1) throw new ApiError('response');
    const members: ClubMember[] = [], tokens = new Set<string>(); let token: string | undefined;
    do {
      const response = page((await client.request(`${base}/members?pageSize=200${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`)).data);
      members.push(...response.items.map(one => parseClubMember(one, id))); token = response.nextPageToken;
      if (token && tokens.has(token)) throw new ApiError('response'); if (token) tokens.add(token);
    } while (token);
    if (new Set(members.map(one => one.id)).size !== members.length || new Set(members.map(one => one.userId)).size !== members.length || !members.some(one => sameMember(one, me)) || members.some(one => one.userId.includes(',') || !parts.some(part => part.id === one.partId))) throw new ApiError('response');
    return { club: { id, name: club.name, memberCount: club.memberCount as number }, members: members.filter(one => one.userId !== userId), parts };
  }
  function batch(value: unknown, ids: readonly string[]) {
    const data = object(value);
    if (!Array.isArray(data.items) || data.items.length !== ids.length) throw new ApiError('response');
    const entries = data.items.map(object), keys = entries.map(one => one.userId);
    if (new Set(keys).size !== keys.length || keys.some(one => typeof one !== 'string' || !ids.includes(one))) throw new ApiError('response');
    return new Map(entries.map(one => [one.userId as string, one]));
  }
  return createFriendsService({
    userId,
    async getBoard(id) {
      const data = await context(id), friends: Friend[] = [];
      if (!data.members.length) return { club: data.club, friends };
      const items = parseShopCatalog((await client.request('/items')).data);
      for (let offset = 0; offset < data.members.length; offset += 100) {
        const members = data.members.slice(offset, offset + 100), ids = members.map(one => one.userId), query = encodeURIComponent(ids.join(','));
        const [roomsResponse, statsResponse] = await Promise.all([client.request(`/users/-/room:batchGet?userIds=${query}`), client.request(`/users/-/stats:batchGet?userIds=${query}`)]);
        const rooms = batch(roomsResponse.data, ids), stats = batch(statsResponse.data, ids);
        friends.push(...members.map(member => friend(member, data.parts.find(part => part.id === member.partId)!, rooms.get(member.userId), stats.get(member.userId), items)));
      }
      return { club: data.club, friends };
    },
    async getVisit(id, memberId) {
      identifier(memberId);
      const data = await context(id), member = data.members.find(one => one.id === memberId);
      if (!member) throw new ApiError('http', 404);
      const base = `/users/${encodeURIComponent(member.userId)}`;
      const [room, stats, catalog] = await Promise.all([client.request(`${base}/room`), client.request(`${base}/stats`), client.request('/items')]);
      return { club: data.club, friend: friend(member, data.parts.find(part => part.id === member.partId)!, room.data, stats.data, parseShopCatalog(catalog.data)) };
    },
    async like(id, liked) { await client.request(`/users/${encodeURIComponent(id)}/likes/me`, { method: liked ? 'PUT' : 'DELETE' }); },
  });
}
