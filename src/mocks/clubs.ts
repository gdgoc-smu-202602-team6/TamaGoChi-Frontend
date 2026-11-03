import type { JoinedClub } from '../types/notice';
import { mockClubCatalog, type MockApplicationStore } from './club-data';
import { getMockMembers } from './club-members-data';
import { readCreatedMockClubs } from './created-clubs';
import { readMockClubMetadata, withMockClubMetadata } from './club-settings-data';

export { MOCK_APPLICATION_STORAGE_KEY, mockClubCatalog, mockInviteCodes, readMockApplications, type MockApplicationStore } from './club-data';
export async function joinedMockClubs(storage: MockApplicationStore): Promise<JoinedClub[]> {
  const [created, registry] = await Promise.all([readCreatedMockClubs(storage), readMockClubMetadata(storage)]);
  const list = await Promise.all([...mockClubCatalog, ...created].map(async club => { const members = await getMockMembers(storage, club.id); return members.some(one => one.userId === 'mock-me') ? withMockClubMetadata({ id: club.id, name: club.name, memberCount: members.length }, registry) : null; }));
  return list.filter((one): one is JoinedClub => one !== null);
}
