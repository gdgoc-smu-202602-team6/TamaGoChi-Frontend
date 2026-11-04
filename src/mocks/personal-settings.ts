import { ApiError } from '../services/api/http-client';
import { createPersonalSettingsService } from '../services/personal-settings-service';
import { PersonalSettingsError } from '../types/personal-settings';
import { getMockMembers } from './club-members-data';
import { joinedMockClubs } from './clubs';
import { mockClubCatalog, type MockApplicationStore } from './club-data';
import { readCreatedMockClubs } from './created-clubs';
import { getMockClubParts } from './club-parts-data';
import { withMockMemberMutation } from './member-removals-data';
import { sameMember } from '../utils/club-members';
import { MOCK_ACCOUNT_SETTINGS_KEY, MOCK_MEMBER_PREFERENCES_KEY, preferencesFor, readMockMemberPreferences, readMockNickname } from './personal-settings-data';

export function createMockPersonalSettingsService(storage: MockApplicationStore) {
  return createPersonalSettingsService({
    getAccount: async () => ({ id: 'mock-me', email: 'mori@example.com', nickname: await readMockNickname(storage, '서연') }),
    async rename(nickname) { try { await storage.setItem(MOCK_ACCOUNT_SETTINGS_KEY, JSON.stringify({ version: 1, nickname })); } catch { throw new PersonalSettingsError('storage'); } },
    async getClub(id) {
      const club = (await joinedMockClubs(storage)).find(one => one.id === id); if (!club) throw new ApiError('http', 404);
      const seed = mockClubCatalog.find(one => one.id === id) ?? (await readCreatedMockClubs(storage)).find(one => one.id === id); if (!seed) throw new ApiError('http', 404);
      const member = (await getMockMembers(storage, id)).find(one => one.userId === 'mock-me'); if (!member) throw new ApiError('http', 404);
      return { club, member, parts: await getMockClubParts(storage, id, seed.parts), notificationsOn: preferencesFor(member, await readMockMemberPreferences(storage))?.notificationsOn ?? true };
    },
    updateClub: (before, input) => withMockMemberMutation(storage, async () => {
      const member = (await getMockMembers(storage, before.club.id)).find(one => one.userId === 'mock-me'); if (!member || member.id !== before.member.id || member.joinedAt !== before.member.joinedAt) throw new ApiError('http', 404);
      const records = await readMockMemberPreferences(storage), previous = preferencesFor(member, records);
      if (!sameMember(member, before.member) || (previous?.notificationsOn ?? true) !== before.notificationsOn) throw new PersonalSettingsError('changed');
      const seed = mockClubCatalog.find(one => one.id === before.club.id) ?? (await readCreatedMockClubs(storage)).find(one => one.id === before.club.id);
      if (!seed || !(await getMockClubParts(storage, seed.id, seed.parts)).some(one => one.id === (input.partId ?? member.partId))) throw new PersonalSettingsError('changed');
      const next = { id: member.id, clubId: member.clubId, userId: member.userId, joinedAt: member.joinedAt, partId: input.partId ?? member.partId, notificationsOn: input.notificationsOn ?? previous?.notificationsOn ?? true };
      try { await storage.setItem(MOCK_MEMBER_PREFERENCES_KEY, JSON.stringify({ version: 1, members: [...records.filter(one => one !== previous), next] })); } catch { throw new PersonalSettingsError('storage'); }
    }),
  });
}
