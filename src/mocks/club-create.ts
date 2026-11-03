import { createGuardedClubCreateService } from '../services/club-create-service';
import { ApiError } from '../services/api/http-client';
import type { ClubCreateStore } from '../types/club-create';
import { MOCK_CREATED_CLUBS_KEY, readCreatedMockClubs, type MockCreatedClub } from './created-clubs';
import { mockInviteCodes, type MockApplicationStore } from './clubs';

export const MOCK_CLUB_CREATE_JOURNAL_KEY = '@tamagochi/mock-club-create-intent/v1';
export function createMockClubCreateService(storage: MockApplicationStore, now = Date.now) {
  const store: ClubCreateStore = {
    get: () => storage.getItem(MOCK_CLUB_CREATE_JOURNAL_KEY),
    set: value => storage.setItem(MOCK_CLUB_CREATE_JOURNAL_KEY, value ?? 'null'),
  };
  // Treat the JSON null marker as an empty journal; existing storage adapters need no removeItem API.
  return createGuardedClubCreateService({ ...store, get: async () => { const raw = await store.get(); return raw === 'null' ? null : raw; } }, {
    async create(input) {
      const clubs = await readCreatedMockClubs(storage);
      const id = `mock-created-${now()}-${Math.random().toString(36).slice(2, 10)}`;
      let inviteCode: string;
      do { inviteCode = Array.from({ length: 8 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join(''); }
      while (mockInviteCodes[inviteCode] || clubs.some(club => club.inviteCode === inviteCode));
      const club: MockCreatedClub = { id, name: input.name, memberCount: 1, inviteCode, createdAt: new Date(now()).toISOString(), myPartName: input.myPartName,
        parts: input.parts.map((part, index) => ({ ...part, id: `${id}-part-${index}` })) };
      await storage.setItem(MOCK_CREATED_CLUBS_KEY, JSON.stringify({ version: 1, clubs: [...clubs, club] }));
      return club;
    },
    async get(id) {
      const club = (await readCreatedMockClubs(storage)).find(club => club.id === id);
      if (!club) throw new ApiError('http', 404);
      return club;
    },
  });
}
