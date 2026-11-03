import type { ClubPart } from '../types/club-join';
import { ClubPartsError } from '../types/club-parts';
import { paletteColors } from '../types/notice';

export const MOCK_CLUB_PARTS_KEY = '@tamagochi/mock-club-parts/v1';
// Explicit existing member references for the preview. New created clubs use their creator's part.
export const mockMemberPartIds: Readonly<Record<string, readonly string[]>> = { 'mock-club-study': ['mock-part-reading', 'mock-part-focus'], 'mock-club-pixel': ['mock-part-pixel'], 'mock-club-forest': ['mock-part-sprout'] };
export async function readMockPartsRegistry(storage: { getItem: (key: string) => Promise<string | null> }): Promise<Record<string, ClubPart[]>> {
  try {
    const raw = await storage.getItem(MOCK_CLUB_PARTS_KEY);
    if (raw === null) return {};
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !data.clubs || typeof data.clubs !== 'object' || Array.isArray(data.clubs)
      || !Object.entries(data.clubs).every(([id, parts]) => !!id && Array.isArray(parts) && parts.every(part => part && typeof part.id === 'string' && !!part.id && typeof part.name === 'string' && !!part.name.trim() && paletteColors.includes(part.color))
        && new Set(parts.map(part => part.id)).size === parts.length && new Set(parts.map(part => part.name)).size === parts.length)) throw new Error();
    return data.clubs;
  } catch { throw new ClubPartsError('storage'); }
}
export async function getMockClubParts(storage: { getItem: (key: string) => Promise<string | null> }, clubId: string, defaults: readonly ClubPart[]): Promise<ClubPart[]> {
  const registry = await readMockPartsRegistry(storage), parts = Object.hasOwn(registry, clubId) ? registry[clubId] : defaults;
  return parts.map(one => ({ ...one }));
}
