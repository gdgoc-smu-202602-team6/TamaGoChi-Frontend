import type { ClubPreview } from '../types/club-join';
import type { CreatedClub } from '../types/club-create';
import { paletteColors } from '../types/notice';
import { validInviteCode } from '../utils/club-join';

export const MOCK_CREATED_CLUBS_KEY = '@tamagochi/mock-created-clubs/v1';
export type MockCreatedClub = ClubPreview & CreatedClub & { inviteCode: string; myPartName: string };
export async function readCreatedMockClubs(storage: { getItem: (key: string) => Promise<string | null> }): Promise<MockCreatedClub[]> {
  const raw = await storage.getItem(MOCK_CREATED_CLUBS_KEY);
  if (raw === null) return [];
  const data = JSON.parse(raw);
  if (!data || data.version !== 1 || !Array.isArray(data.clubs) || !data.clubs.every((club: MockCreatedClub) => club
    && typeof club.id === 'string' && club.id.startsWith('mock-created-') && typeof club.name === 'string' && !!club.name.trim()
    && club.memberCount === 1 && typeof club.inviteCode === 'string' && validInviteCode(club.inviteCode)
    && typeof club.createdAt === 'string' && Number.isFinite(Date.parse(club.createdAt))
    && Array.isArray(club.parts) && club.parts.length > 0 && club.parts.every(part => part && typeof part.id === 'string' && !!part.id && typeof part.name === 'string' && !!part.name.trim() && paletteColors.includes(part.color))
    && new Set(club.parts.map(part => part.id)).size === club.parts.length && new Set(club.parts.map(part => part.name)).size === club.parts.length
    && club.parts.some(part => part.name === club.myPartName))
    || new Set(data.clubs.map((club: MockCreatedClub) => club.id)).size !== data.clubs.length
    || new Set(data.clubs.map((club: MockCreatedClub) => club.inviteCode)).size !== data.clubs.length) throw new Error('Invalid mock created clubs');
  return data.clubs;
}
