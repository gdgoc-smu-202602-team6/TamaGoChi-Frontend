import { ClubSettingsError } from '../types/club-settings';
import { validInviteCode } from '../utils/club-join';

export const MOCK_CLUB_SETTINGS_KEY = '@tamagochi/mock-club-settings/v1';
export type MockClubMetadata = { name: string; inviteCode: string; revision: number };
export async function readMockClubMetadata(storage: { getItem: (key: string) => Promise<string | null> }): Promise<Record<string, MockClubMetadata>> {
  try {
    const raw = await storage.getItem(MOCK_CLUB_SETTINGS_KEY);
    if (raw === null) return {};
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || !value.clubs || typeof value.clubs !== 'object' || Array.isArray(value.clubs)
      || !Object.entries(value.clubs).every(([id, one]) => { const entry = one as MockClubMetadata; return !!id && entry && typeof entry.name === 'string' && !!entry.name.trim() && typeof entry.inviteCode === 'string' && validInviteCode(entry.inviteCode) && Number.isSafeInteger(entry.revision) && entry.revision >= 0; })
      || new Set(Object.values(value.clubs).map(one => (one as MockClubMetadata).inviteCode)).size !== Object.keys(value.clubs).length) throw new Error();
    return value.clubs;
  } catch { throw new ClubSettingsError('storage'); }
}
export function withMockClubMetadata<T extends { id: string; name: string }>(club: T, registry: Record<string, MockClubMetadata>): T {
  const override = Object.hasOwn(registry, club.id) ? registry[club.id] : undefined;
  return override ? { ...club, name: override.name, ...('inviteCode' in club ? { inviteCode: override.inviteCode } : {}) } : club;
}
