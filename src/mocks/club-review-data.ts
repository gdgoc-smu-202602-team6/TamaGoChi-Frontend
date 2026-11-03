import { ClubAdminError, type ReviewApplication } from '../types/club-admin';

export const MOCK_CLUB_REVIEW_KEY = '@tamagochi/mock-club-reviews/v1';
const defaults: readonly ReviewApplication[] = [
  { id: 'mock-review-sky', clubId: 'mock-club-study', userId: 'mock-applicant-sky', nickname: '하늘', email: 'haneul@example.com', partId: 'mock-part-reading', state: 'PENDING', createdAt: '2026-11-03T01:00:00Z' },
  { id: 'mock-review-forest', clubId: 'mock-club-study', userId: 'mock-applicant-forest', nickname: '나무', email: 'tree@example.com', partId: 'mock-part-focus', state: 'PENDING', createdAt: '2026-11-03T00:00:00Z' },
];
export async function readMockClubReviews(storage: { getItem: (key: string) => Promise<string | null> }): Promise<ReviewApplication[]> {
  try {
    const raw = await storage.getItem(MOCK_CLUB_REVIEW_KEY);
    if (raw === null) return defaults.map(one => ({ ...one }));
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.applications) || !data.applications.every((one: ReviewApplication) => one
      && [one.id, one.clubId, one.userId].every(value => typeof value === 'string' && value.length > 0)
      && typeof one.nickname === 'string' && typeof one.email === 'string' && ['PENDING', 'APPROVED', 'REJECTED'].includes(one.state)
      && (typeof one.partId === 'string' || (one.partId === null && one.state !== 'PENDING'))
      && typeof one.createdAt === 'string' && Number.isFinite(Date.parse(one.createdAt))
      && (one.decidedAt === undefined || (typeof one.decidedAt === 'string' && Number.isFinite(Date.parse(one.decidedAt)))))
      || new Set(data.applications.map((one: ReviewApplication) => one.id)).size !== data.applications.length) throw new Error();
    return data.applications;
  } catch { throw new ClubAdminError('storage'); }
}
export function mockApprovedMemberCount(applications: readonly ReviewApplication[], clubId: string): number {
  return new Set(applications.filter(one => one.clubId === clubId && one.state === 'APPROVED').map(one => one.userId)).size;
}
