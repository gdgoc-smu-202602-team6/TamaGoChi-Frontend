import { ClubAdminError, type ClubAdminService } from '../types/club-admin';
import { joinedMockClubs, mockClubCatalog, type MockApplicationStore } from './clubs';
import { readCreatedMockClubs } from './created-clubs';
import { MOCK_CLUB_REVIEW_KEY, readMockClubReviews } from './club-review-data';

export function createMockClubAdminService(storage: MockApplicationStore, now = Date.now): ClubAdminService {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  async function getPermissions(clubId: string) {
    if (!(await joinedMockClubs(storage)).some(club => club.id === clubId)) throw new ClubAdminError('not-found');
    // Explicit preview roles: first club + clubs created by the preview user are managed;
    // the second club and joined-by-approval clubs remain ordinary memberships.
    return clubId === 'mock-club-study' || (await readCreatedMockClubs(storage)).some(club => club.id === clubId) ? ['applications.decide' as const, 'notices.write' as const, 'noticeCategories.manage' as const] : [];
  }
  async function requireReview(clubId: string) { if (!(await getPermissions(clubId)).includes('applications.decide')) throw new ClubAdminError('forbidden'); }
  return {
    getPermissions,
    getBoard: clubId => serial(async () => {
      await requireReview(clubId);
      const club = (await joinedMockClubs(storage)).find(club => club.id === clubId)!;
      const details = mockClubCatalog.find(club => club.id === clubId) ?? (await readCreatedMockClubs(storage)).find(club => club.id === clubId)!;
      return { club, parts: details.parts, applications: (await readMockClubReviews(storage)).filter(one => one.clubId === clubId && one.state === 'PENDING') };
    }),
    decide: (clubId, id, decision) => serial(async () => {
      if (!['APPROVED', 'REJECTED'].includes(decision)) throw new ClubAdminError('invalid');
      await requireReview(clubId);
      const applications = await readMockClubReviews(storage), current = applications.find(one => one.id === id && one.clubId === clubId);
      if (!current) throw new ClubAdminError('not-found');
      if (current.state !== 'PENDING') return current;
      if (decision === 'APPROVED' && applications.some(one => one.clubId === clubId && one.userId === current.userId && one.state === 'APPROVED')) throw new ClubAdminError('already-member');
      const result = { ...current, state: decision, decidedAt: new Date(now()).toISOString() };
      try { await storage.setItem(MOCK_CLUB_REVIEW_KEY, JSON.stringify({ version: 1, applications: applications.map(one => one.id === id ? result : one) })); }
      catch { throw new ClubAdminError('storage'); }
      return result;
    }),
  };
}
