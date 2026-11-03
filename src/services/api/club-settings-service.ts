import { createClubSettingsService } from '../club-settings-service';
import { ClubSettingsError, type ClubSettings } from '../../types/club-settings';
import { validInviteCode } from '../../utils/club-join';
import { createApiClubAdminService } from './club-admin-service';
import { isDateTime, isSessionId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

export function parseClubSettings(data: unknown, id: string, headers: Headers): ClubSettings {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ApiError('response');
  const club = data as Record<string, unknown>, tag = headers.get('etag');
  if (club.id !== id || !isSessionId(club.id) || typeof club.name !== 'string' || !club.name.trim() || !Number.isSafeInteger(club.memberCount) || (club.memberCount as number) < 1
    || !isDateTime(club.createdAt) || typeof club.inviteCode !== 'string' || !validInviteCode(club.inviteCode) || (tag !== null && !/^"\d+"$/.test(tag))) throw new ApiError('response');
  return { id, name: club.name, memberCount: club.memberCount as number, createdAt: club.createdAt, inviteCode: club.inviteCode, ...(tag ? { etag: tag } : {}) };
}
export function createApiClubSettingsService(client: HttpClient) {
  const access = createApiClubAdminService(client);
  const path = (id: string) => { if (!isSessionId(id)) throw new ApiError('response'); return `/clubs/${id}`; };
  return createClubSettingsService({
    async get(id) {
      const endpoint = path(id);
      if (!(await access.getPermissions(id)).includes('club.update')) throw new ClubSettingsError('forbidden');
      const response = await client.request(endpoint);
      return parseClubSettings(response.data, id, response.headers);
    },
    async apply(id, action, current) {
      const response = await client.request(`${path(id)}${action.kind === 'rotate' ? ':regenerateInviteCode' : ''}`, action.kind === 'rename'
        ? { method: 'PATCH', body: { name: action.name }, ifMatch: current.etag } : { method: 'POST' });
      const club = parseClubSettings(response.data, id, response.headers);
      if (action.kind === 'rename' ? club.name !== action.name : club.inviteCode === current.inviteCode) throw new ApiError('response');
    },
  });
}
