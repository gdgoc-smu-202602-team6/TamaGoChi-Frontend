import { createGuardedClubCreateService } from '../club-create-service';
import type { ClubCreateStore, CreatedClub } from '../../types/club-create';
import { validInviteCode } from '../../utils/club-join';
import { isDateTime, isSessionId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

function parseClub(value: unknown): CreatedClub {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('response');
  const club = value as Record<string, unknown>;
  if (!isSessionId(club.id) || typeof club.name !== 'string' || !club.name.trim()
    || !Number.isSafeInteger(club.memberCount) || (club.memberCount as number) < 1 || !isDateTime(club.createdAt)
    || (club.inviteCode !== undefined && (typeof club.inviteCode !== 'string' || !validInviteCode(club.inviteCode)))) throw new ApiError('response');
  return { id: club.id, name: club.name, memberCount: club.memberCount as number, createdAt: club.createdAt, inviteCode: club.inviteCode as string | undefined };
}
export function createApiClubCreateService(client: HttpClient, store: ClubCreateStore) {
  return createGuardedClubCreateService(store, {
    async create(input) {
      const club = parseClub((await client.request('/clubs', { method: 'POST', body: input })).data);
      if (club.name !== input.name) throw new ApiError('response');
      return club;
    },
    async get(id) {
      if (!isSessionId(id)) throw new ApiError('response');
      return parseClub((await client.request(`/clubs/${id}`)).data);
    },
  });
}
