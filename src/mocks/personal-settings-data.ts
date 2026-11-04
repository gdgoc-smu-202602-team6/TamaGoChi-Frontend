import { PersonalSettingsError } from '../types/personal-settings';
import { validateNickname } from '../utils/auth-validation';
import type { ClubMember } from '../types/club-members';
import type { MockApplicationStore } from './club-data';

export const MOCK_ACCOUNT_SETTINGS_KEY = '@tamagochi/mock-account-settings/v1';
export const MOCK_MEMBER_PREFERENCES_KEY = '@tamagochi/mock-member-preferences/v1';
export type MockMemberPreferences = Pick<ClubMember, 'id' | 'clubId' | 'userId' | 'joinedAt' | 'partId'> & { notificationsOn: boolean };
export async function readMockNickname(storage: MockApplicationStore, fallback = '모리'): Promise<string> {
  try { const raw = await storage.getItem(MOCK_ACCOUNT_SETTINGS_KEY); if (raw === null) return fallback; const data = JSON.parse(raw); if (!data || data.version !== 1 || typeof data.nickname !== 'string' || validateNickname(data.nickname)) throw new Error(); return data.nickname; } catch { throw new PersonalSettingsError('storage'); }
}
export async function readMockMemberPreferences(storage: MockApplicationStore): Promise<MockMemberPreferences[]> {
  try { const raw = await storage.getItem(MOCK_MEMBER_PREFERENCES_KEY); if (raw === null) return []; const data = JSON.parse(raw); if (!data || data.version !== 1 || !Array.isArray(data.members) || !data.members.every((one: MockMemberPreferences) => one && [one.id, one.clubId, one.userId, one.partId, one.joinedAt].every(value => typeof value === 'string' && !!value) && Number.isFinite(Date.parse(one.joinedAt)) && typeof one.notificationsOn === 'boolean') || new Set(data.members.map((one: MockMemberPreferences) => `${one.clubId}/${one.id}/${one.joinedAt}`)).size !== data.members.length) throw new Error(); return data.members; } catch { throw new PersonalSettingsError('storage'); }
}
export const preferencesFor = (member: ClubMember, records: readonly MockMemberPreferences[]) => records.find(one => one.id === member.id && one.clubId === member.clubId && one.userId === member.userId && one.joinedAt === member.joinedAt);
