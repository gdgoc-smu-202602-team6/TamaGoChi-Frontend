import { ClubJoinError, type ClubApplication, type ClubJoinService } from '../types/club-join';
import { normalizeInviteCode, validInviteCode } from '../utils/club-join';
import { joinedMockClubs, MOCK_APPLICATION_STORAGE_KEY, mockClubCatalog, mockInviteCodes, readMockApplications, type MockApplicationStore } from './clubs';
import { readCreatedMockClubs } from './created-clubs';

export function createMockClubJoinService(storage: MockApplicationStore, now = Date.now): ClubJoinService {
  let queue: Promise<unknown> = Promise.resolve(), sequence = 0;
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  const decorate = (one: ClubApplication): ClubApplication => {
    const club = mockClubCatalog.find(club => club.id === one.clubId);
    return { ...one, clubName: club?.name, partName: club?.parts.find(part => part.id === one.partId)?.name };
  };
  async function save(applications: ClubApplication[]) {
    try { await storage.setItem(MOCK_APPLICATION_STORAGE_KEY, JSON.stringify({ version: 1, applications })); }
    catch { throw new ClubJoinError('storage'); }
  }
  return {
    getOverview: () => serial(async () => ({ clubs: await joinedMockClubs(storage), applications: (await readMockApplications(storage)).filter(one => one.state !== 'REJECTED' || Date.parse(one.decidedAt ?? one.createdAt) >= now() - 7 * 86400000).map(decorate) })),
    findClub: code => serial(async () => {
      const normalized = normalizeInviteCode(code);
      if (!validInviteCode(normalized)) throw new ClubJoinError('invalid-code');
      const club = mockClubCatalog.find(club => club.id === mockInviteCodes[normalized]) ?? (await readCreatedMockClubs(storage)).find(club => club.inviteCode === normalized);
      return club ? { id: club.id, name: club.name, memberCount: club.memberCount, parts: club.parts } : null;
    }),
    apply: (clubId, partId) => serial(async () => {
      const current = await readMockApplications(storage), pending = current.find(one => one.clubId === clubId && one.state === 'PENDING');
      if (pending) return decorate(pending);
      if ((await joinedMockClubs(storage)).some(club => club.id === clubId)) throw new ClubJoinError('already-member');
      const club = mockClubCatalog.find(club => club.id === clubId);
      if (!club) throw new ClubJoinError('not-found');
      if (!club.parts.some(part => part.id === partId)) throw new ClubJoinError('part-missing');
      const one: ClubApplication = { id: `mock-application-${now()}-${++sequence}-${Math.random().toString(36).slice(2, 8)}`, clubId, partId, state: 'PENDING', createdAt: new Date(now()).toISOString() };
      await save([one, ...current]); return decorate(one);
    }),
    cancel: (clubId, applicationId) => serial(async () => {
      const current = await readMockApplications(storage), found = current.find(one => one.id === applicationId && one.clubId === clubId);
      if (!found) return 'missing';
      if (found.state !== 'PENDING') throw new ClubJoinError('not-pending');
      await save(current.filter(one => one.id !== applicationId)); return 'cancelled';
    }),
  };
}
