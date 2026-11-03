import type { ClubMember } from '../types/club-members';
import { ClubMembershipError } from '../types/club-membership';

export const MOCK_MEMBER_REMOVALS_KEY = '@tamagochi/mock-member-removals/v1';
export type MockMemberRemoval = Pick<ClubMember, 'id' | 'clubId' | 'userId' | 'joinedAt'>;
const mutations = new WeakMap<object, Promise<unknown>>();
export function withMockMemberMutation<T>(storage: object, work: () => Promise<T>): Promise<T> { const next = (mutations.get(storage) ?? Promise.resolve()).then(work); mutations.set(storage, next.catch(() => undefined)); return next; }
export function isRemoved(member: MockMemberRemoval, records: readonly MockMemberRemoval[]) { return records.some(one => one.id === member.id && one.clubId === member.clubId && one.userId === member.userId && one.joinedAt === member.joinedAt); }
export async function readMockRemovals(storage: { getItem: (key: string) => Promise<string | null> }): Promise<MockMemberRemoval[]> {
  try {
    const raw = await storage.getItem(MOCK_MEMBER_REMOVALS_KEY); if (raw === null) return [];
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.members) || !data.members.every((one: MockMemberRemoval) => one && [one.id, one.clubId, one.userId].every(value => typeof value === 'string' && !!value) && typeof one.joinedAt === 'string' && Number.isFinite(Date.parse(one.joinedAt)))
      || new Set(data.members.map((one: MockMemberRemoval) => `${one.clubId}/${one.id}/${one.joinedAt}`)).size !== data.members.length) throw new Error();
    return data.members;
  } catch { throw new ClubMembershipError('storage'); }
}
export async function saveMockRemoval(storage: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> }, member: ClubMember) {
  const records = await readMockRemovals(storage);
  if (isRemoved(member, records)) return;
  try { await storage.setItem(MOCK_MEMBER_REMOVALS_KEY, JSON.stringify({ version: 1, members: [...records, { id: member.id, clubId: member.clubId, userId: member.userId, joinedAt: member.joinedAt }] })); }
  catch { throw new ClubMembershipError('storage'); }
}
