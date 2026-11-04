import { createPersonalSettingsService } from '../personal-settings-service';
import type { AuthUser } from '../../types/auth';
import { validateEmail, validateNickname } from '../../utils/auth-validation';
import { parseClubMember } from './club-members-service';
import { parseClubParts } from './club-parts-service';
import { isSessionId as isId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('response'); return value as Record<string, unknown>; }
export function createApiPersonalSettingsService(client: HttpClient, userId: string) {
  function account(value: unknown): AuthUser { const data = object(value); if (data.id !== userId || typeof data.email !== 'string' || validateEmail(data.email) || typeof data.nickname !== 'string' || validateNickname(data.nickname)) throw new ApiError('response'); return { id: userId, email: data.email, nickname: data.nickname }; }
  function member(value: unknown, clubId: string) { const parsed = parseClubMember(value, clubId), dto = object(value); if (parsed.userId !== userId || typeof dto.notificationsOn !== 'boolean') throw new ApiError('response'); return { member: parsed, notificationsOn: dto.notificationsOn }; }
  return createPersonalSettingsService({
    getAccount: async () => account((await client.request('/users/me')).data),
    async rename(nickname) { const result = account((await client.request('/users/me', { method: 'PATCH', body: { nickname } })).data); if (result.nickname !== nickname) throw new ApiError('response'); },
    async getClub(id) {
      if (!isId(id)) throw new ApiError('response');
      const own = member((await client.request(`/clubs/${id}/members/me`)).data, id);
      const [clubResponse, partResponse] = await Promise.all([client.request(`/clubs/${id}`), client.request(`/clubs/${id}/parts`)]), club = object(clubResponse.data), parts = parseClubParts(partResponse.data);
      if (club.id !== id || typeof club.name !== 'string' || !club.name.trim() || !Number.isSafeInteger(club.memberCount) || (club.memberCount as number) < 1 || !parts.some(one => one.id === own.member.partId)) throw new ApiError('response');
      return { club: { id, name: club.name, memberCount: club.memberCount as number }, ...own, parts };
    },
    async updateClub(before, body) { if (!isId(before.member.id)) throw new ApiError('response'); const result = member((await client.request(`/clubs/${before.club.id}/members/${before.member.id}`, { method: 'PATCH', body })).data, before.club.id); if (result.member.id !== before.member.id || result.member.joinedAt !== before.member.joinedAt || (body.partId !== undefined && result.member.partId !== body.partId) || (body.notificationsOn !== undefined && result.notificationsOn !== body.notificationsOn)) throw new ApiError('response'); },
  });
}
