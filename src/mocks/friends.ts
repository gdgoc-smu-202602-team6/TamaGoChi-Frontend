import { ApiError } from '../services/api/http-client';
import { createFriendsService } from '../services/friends-service';
import { FriendsError, type Friend } from '../types/friends';
import { mockShopItems } from './shop';
import { joinedMockClubs } from './clubs';
import { mockClubCatalog, type MockApplicationStore } from './club-data';
import { getMockMembers } from './club-members-data';
import { getMockClubParts } from './club-parts-data';
import { readCreatedMockClubs } from './created-clubs';

export const MOCK_LIKES_KEY = '@tamagochi/mock-likes/v1';
const mutations = new WeakMap<object, Promise<unknown>>();
async function likes(storage: MockApplicationStore): Promise<string[]> {
  try {
    const raw = await storage.getItem(MOCK_LIKES_KEY); if (raw === null) return [];
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.userIds) || !data.userIds.every((id: unknown) => typeof id === 'string' && !!id && id !== 'mock-me') || new Set(data.userIds).size !== data.userIds.length) throw new Error();
    return data.userIds;
  } catch { throw new FriendsError('storage'); }
}
export function createMockFriendsService(storage: MockApplicationStore) {
  async function board(id: string) {
    const club = (await joinedMockClubs(storage)).find(one => one.id === id);
    if (!club) throw new ApiError('http', 404);
    const source = mockClubCatalog.find(one => one.id === id) ?? (await readCreatedMockClubs(storage)).find(one => one.id === id);
    if (!source) throw new ApiError('http', 404);
    const [members, parts, liked] = await Promise.all([getMockMembers(storage, id), getMockClubParts(storage, id, source.parts), likes(storage)]);
    const friends: Friend[] = members.filter(one => one.userId !== 'mock-me').map(member => {
      const seed = Array.from(member.userId).reduce((sum, char) => sum * 31 % 10007 + char.codePointAt(0)!, 7), level = 1 + seed % 12;
      const room = level >= 10 && seed % 2 ? 'dream_mansion' : level >= 5 && seed % 3 ? 'spacious_two_room' : seed % 2 ? 'cozy_one_room' : 'shabby_gosiwon';
      const characters = mockShopItems.filter(one => one.slot === 'CHARACTER' && one.minLevel <= level);
      const codes = ['basic_clock', 'basic_window', 'basic_desk', seed % 2 ? 'grubby_wall' : 'mint_stripe_wallpaper', room, characters[seed % characters.length].code, 'green_plant', ...(seed % 2 ? ['pompom_beanie'] : ['cozy_scarf'])];
      const items = mockShopItems.filter(one => codes.includes(one.code) && one.minLevel <= level), part = parts.find(one => one.id === member.partId);
      if (!part) throw new FriendsError('storage');
      return { member, part, appearance: { items, placements: [], size: items.find(one => one.slot === 'ROOM')!.roomSize!, wallHeight: 3 }, condition: { hearts: seed % 5, bugs: seed % 4, bugProgressSeconds: 0 }, level, todaySeconds: seed % 181 * 60, likeCount: seed % 25 + (liked.includes(member.userId) ? 1 : 0), likedByMe: liked.includes(member.userId) };
    });
    return { club, friends };
  }
  return createFriendsService({
    userId: 'mock-me', getBoard: board,
    async getVisit(id, memberId) { const data = await board(id), friend = data.friends.find(one => one.member.id === memberId); if (!friend) throw new ApiError('http', 404); return { club: data.club, friend }; },
    like(id, liked) {
      const task = (mutations.get(storage) ?? Promise.resolve()).then(async () => {
        if (id === 'mock-me' || !(await joinedMockClubs(storage)).length) throw new ApiError('http', 404);
        const clubs = await joinedMockClubs(storage);
        if (!(await Promise.all(clubs.map(club => getMockMembers(storage, club.id)))).some(members => members.some(one => one.userId === id))) throw new ApiError('http', 404);
        const current = await likes(storage), next = liked ? [...new Set([...current, id])] : current.filter(one => one !== id);
        try { await storage.setItem(MOCK_LIKES_KEY, JSON.stringify({ version: 1, userIds: next })); } catch { throw new FriendsError('storage'); }
      });
      mutations.set(storage, task.catch(() => undefined)); return task;
    },
  });
}
