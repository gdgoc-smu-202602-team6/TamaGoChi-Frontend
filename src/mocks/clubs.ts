import type { ClubApplication, ClubPreview } from '../types/club-join';
import type { JoinedClub } from '../types/notice';

export const MOCK_APPLICATION_STORAGE_KEY = '@tamagochi/mock-club-applications/v1';
export const mockClubCatalog: readonly ClubPreview[] = [
  { id: 'mock-club-study', name: '함께 공부하는 모임', memberCount: 12, parts: [{ id: 'mock-part-reading', name: '함께 읽기', color: 'GREEN' }, { id: 'mock-part-focus', name: '집중 공부', color: 'BLUE' }] },
  { id: 'mock-club-pixel', name: '픽셀 메이커스', memberCount: 8, parts: [{ id: 'mock-part-pixel', name: '픽셀 아트', color: 'PINK' }] },
  { id: 'mock-club-forest', name: '함께 성장하는 숲', memberCount: 6, parts: [{ id: 'mock-part-sprout', name: '새싹 공부', color: 'GREEN' }, { id: 'mock-part-tree', name: '나무 공부', color: 'PURPLE' }] },
];
export const mockInviteCodes: Readonly<Record<string, string>> = { STUDY001: 'mock-club-study', PIXEL001: 'mock-club-pixel', MORI2026: 'mock-club-forest' };
export type MockApplicationStore = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };
export async function readMockApplications(storage: MockApplicationStore): Promise<ClubApplication[]> {
  const raw = await storage.getItem(MOCK_APPLICATION_STORAGE_KEY);
  if (raw === null) return [];
  const data = JSON.parse(raw);
  if (!data || data.version !== 1 || !Array.isArray(data.applications) || !data.applications.every((one: ClubApplication) => one && typeof one.id === 'string' && one.id.length > 0
    && mockClubCatalog.some(club => club.id === one.clubId) && ['PENDING', 'APPROVED', 'REJECTED'].includes(one.state)
    && (typeof one.partId === 'string' || (one.partId === null && one.state !== 'PENDING')) && typeof one.createdAt === 'string' && Number.isFinite(Date.parse(one.createdAt))
    && (one.decidedAt === undefined || (typeof one.decidedAt === 'string' && Number.isFinite(Date.parse(one.decidedAt)))))
    || new Set(data.applications.map((one: ClubApplication) => one.id)).size !== data.applications.length) throw new Error('Invalid mock club applications');
  return data.applications;
}
export async function joinedMockClubs(storage: MockApplicationStore): Promise<JoinedClub[]> {
  const approved = (await readMockApplications(storage)).filter(one => one.state === 'APPROVED');
  return mockClubCatalog.filter((club, index) => index < 2 || approved.some(one => one.clubId === club.id)).map(({ id, name, memberCount }, index) => ({ id, name, memberCount: memberCount + (index >= 2 ? 1 : 0) }));
}
