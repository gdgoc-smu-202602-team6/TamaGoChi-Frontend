import { ApiError } from './api/http-client';
import { FriendsError, type FriendsService } from '../types/friends';
import { sameMember } from '../utils/club-members';

export function createFriendsService(backend: Pick<FriendsService, 'getBoard' | 'getVisit'> & { userId: string; like: (userId: string, liked: boolean) => Promise<void> }): FriendsService {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  return {
    // An old screen's slow read must not hold up a different club or room.
    getBoard: async id => { const board = await backend.getBoard(id); return { ...board, friends: [...board.friends].sort((a, b) => b.todaySeconds - a.todaySeconds) }; },
    getVisit: (id, memberId) => backend.getVisit(id, memberId),
    setLike: (id, expected, liked) => serial(async () => {
      if (expected.clubId !== id || expected.userId === backend.userId || typeof liked !== 'boolean') throw new FriendsError('invalid');
      const before = await backend.getVisit(id, expected.id);
      if (!sameMember(before.friend.member, expected)) throw new FriendsError('changed');
      if (before.friend.likedByMe === liked) return before;
      try { await backend.like(expected.userId, liked); }
      catch (error) { if (error instanceof ApiError && error.kind === 'http' && error.status && error.status < 500 && error.status !== 408) throw error; }
      try { const actual = await backend.getVisit(id, expected.id); if (actual.friend.member.userId === expected.userId && actual.friend.likedByMe === liked) return actual; }
      catch (error) { if (error instanceof ApiError && (error.kind === 'session' || [401, 403, 404].includes(error.status ?? 0))) throw error; }
      throw new FriendsError('uncertain');
    }),
  };
}
