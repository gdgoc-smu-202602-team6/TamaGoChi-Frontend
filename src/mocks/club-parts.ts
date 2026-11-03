import { createClubPartsService } from '../services/club-parts-service';
import { ApiError } from '../services/api/http-client';
import { ClubPartsError } from '../types/club-parts';
import type { ClubPart } from '../types/club-join';
import { createMockClubAdminService } from './club-admin';
import { joinedMockClubs, mockClubCatalog, readMockApplications, type MockApplicationStore } from './clubs';
import { getMockClubParts, MOCK_CLUB_PARTS_KEY, mockMemberPartIds, readMockPartsRegistry } from './club-parts-data';
import { readMockClubReviews } from './club-review-data';
import { readCreatedMockClubs } from './created-clubs';

export function createMockClubPartsService(storage: MockApplicationStore) {
  const access = createMockClubAdminService(storage);
  async function parts(id: string) { const club = mockClubCatalog.find(one => one.id === id) ?? (await readCreatedMockClubs(storage)).find(one => one.id === id); if (!club) throw new ClubPartsError('forbidden'); return getMockClubParts(storage, id, club.parts); }
  async function save(id: string, list: ClubPart[]) {
    const registry = await readMockPartsRegistry(storage);
    try { await storage.setItem(MOCK_CLUB_PARTS_KEY, JSON.stringify({ version: 1, clubs: { ...registry, [id]: [...list].sort((a, b) => a.name.localeCompare(b.name)) } })); }
    catch { throw new ClubPartsError('storage'); }
  }
  return createClubPartsService({
    async getBoard(id) {
      if (!(await access.getPermissions(id)).includes('parts.manage')) throw new ClubPartsError('forbidden');
      return { club: (await joinedMockClubs(storage)).find(one => one.id === id)!, parts: await parts(id) };
    },
    async apply(id, action) {
      const current = await parts(id);
      if (action.kind === 'add') {
        if (current.some(one => one.name === action.name)) throw new ClubPartsError('duplicate');
        await save(id, [...current, { id: `mock-part-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: action.name, color: action.color }]);
      } else {
        if (!current.some(one => one.id === action.part.id)) throw new ApiError('http', 404);
        const created = (await readCreatedMockClubs(storage)).find(one => one.id === id), creatorPart = created?.parts.find(one => one.name === created.myPartName)?.id;
        const [applications, reviews] = await Promise.all([readMockApplications(storage), readMockClubReviews(storage)]);
        if (mockMemberPartIds[id]?.includes(action.part.id) || creatorPart === action.part.id || [...applications, ...reviews].some(one => one.clubId === id && one.partId === action.part.id && ['PENDING', 'APPROVED'].includes(one.state))) throw new ClubPartsError('in-use');
        await save(id, current.filter(one => one.id !== action.part.id));
      }
    },
  });
}
