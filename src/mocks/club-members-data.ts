import { clubPermissions } from '../types/club-admin';
import { ClubMembersError, type ClubMember, type ClubRole } from '../types/club-members';
import { mockClubCatalog, readMockApplications, type MockApplicationStore } from './clubs';
import { readMockClubReviews } from './club-review-data';
import { readCreatedMockClubs } from './created-clubs';

export const MOCK_MEMBER_ROLES_KEY = '@tamagochi/mock-member-roles/v1';
export const mockRoles: readonly ClubRole[] = [{ id: 'mock-role-manager', name: '운영진', permissions: [...clubPermissions] }, { id: 'mock-role-member', name: '부원', permissions: [] }];
export async function readMockRoleRegistry(storage: MockApplicationStore): Promise<Record<string, Record<string, string>>> {
  try {
    const raw = await storage.getItem(MOCK_MEMBER_ROLES_KEY); if (raw === null) return {};
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !data.clubs || typeof data.clubs !== 'object' || Array.isArray(data.clubs) || !Object.entries(data.clubs).every(([id, roles]) => !!id && roles && typeof roles === 'object' && !Array.isArray(roles)
      && Object.entries(roles).every(([memberId, roleId]) => !!memberId && mockRoles.some(role => role.id === roleId)))) throw new Error();
    return data.clubs;
  } catch { throw new ClubMembersError('storage'); }
}
export async function getMockMembers(storage: MockApplicationStore, clubId: string): Promise<ClubMember[]> {
  const [created, applications, reviews, registry] = await Promise.all([readCreatedMockClubs(storage), readMockApplications(storage), readMockClubReviews(storage), readMockRoleRegistry(storage)]);
  const made = created.find(one => one.id === clubId), seed = mockClubCatalog.find(one => one.id === clubId);
  if (!made && !seed) throw new ClubMembersError('forbidden');
  const isJoinedForest = applications.find(one => one.clubId === clubId && one.state === 'APPROVED'), partId = made?.parts.find(one => one.name === made.myPartName)?.id ?? isJoinedForest?.partId ?? seed!.parts[0].id;
  const members: ClubMember[] = [{ id: 'mock-member-me', clubId, userId: 'mock-me', nickname: '모리', partId, roleId: made || clubId === 'mock-club-study' ? mockRoles[0].id : mockRoles[1].id, joinedAt: made?.createdAt ?? isJoinedForest?.decidedAt ?? '2026-11-01T00:00:00Z' }];
  const otherCount = seed ? seed.memberCount - (isJoinedForest ? 0 : 1) : 0;
  for (let i = 0; i < otherCount; i++) members.push({ id: `mock-colleague-${i + 1}`, clubId, userId: `mock-user-${i + 1}`, nickname: `공부 친구 ${i + 1}`, partId: seed!.parts[i % seed!.parts.length].id, roleId: i === 0 && clubId !== 'mock-club-study' ? mockRoles[0].id : mockRoles[1].id, joinedAt: '2026-11-01T00:00:00Z' });
  for (const review of reviews.filter(one => one.clubId === clubId && one.state === 'APPROVED')) {
    if (!members.some(one => one.userId === review.userId) && review.partId) members.push({ id: `mock-member-${review.id}`, clubId, userId: review.userId, nickname: review.nickname, partId: review.partId, roleId: mockRoles[1].id, joinedAt: review.decidedAt ?? review.createdAt });
  }
  const overrides = Object.hasOwn(registry, clubId) ? registry[clubId] : {};
  return members.map(one => ({ ...one, roleId: Object.hasOwn(overrides, one.id) ? overrides[one.id] : one.roleId }));
}
export async function getMockSelfPermissions(storage: MockApplicationStore, clubId: string) {
  const me = (await getMockMembers(storage, clubId)).find(one => one.userId === 'mock-me');
  return mockRoles.find(role => role.id === me?.roleId)?.permissions ?? [];
}
