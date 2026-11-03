import { createClubPartsService } from '../club-parts-service';
import type { ClubPart } from '../../types/club-join';
import { ClubPartsError } from '../../types/club-parts';
import { paletteColors } from '../../types/notice';
import { createApiClubAdminService } from './club-admin-service';
import { isSessionId as isId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

export function parseClubParts(value: unknown): ClubPart[] {
  const data = value as { items?: unknown[] } | null;
  if (!data || !Array.isArray(data.items)) throw new ApiError('response');
  const result = data.items.map(one => {
    const part = one as Record<string, unknown> | null;
    if (!part || !isId(part.id) || typeof part.name !== 'string' || !part.name.trim() || !paletteColors.includes(part.color as ClubPart['color'])) throw new ApiError('response');
    return { id: part.id, name: part.name, color: part.color as ClubPart['color'] };
  });
  if (new Set(result.map(one => one.id)).size !== result.length || new Set(result.map(one => one.name)).size !== result.length) throw new ApiError('response');
  return result;
}
export function createApiClubPartsService(client: HttpClient) {
  const access = createApiClubAdminService(client);
  const base = (id: string) => { if (!isId(id)) throw new ApiError('response'); return `/clubs/${id}`; };
  return createClubPartsService({
    async getBoard(id) {
      const path = base(id);
      if (!(await access.getPermissions(id)).includes('parts.manage')) throw new ClubPartsError('forbidden');
      const [clubResponse, response] = await Promise.all([client.request(path), client.request(`${path}/parts`)]), club = clubResponse.data as Record<string, unknown> | null;
      if (!club || club.id !== id || typeof club.name !== 'string' || !club.name.trim() || !Number.isSafeInteger(club.memberCount) || (club.memberCount as number) < 0) throw new ApiError('response');
      return { club: { id, name: club.name, memberCount: club.memberCount as number }, parts: parseClubParts(response.data) };
    },
    async apply(id, action) {
      if (action.kind === 'add') {
        const result = (await client.request(`${base(id)}/parts`, { method: 'POST', body: { name: action.name, color: action.color } })).data;
        const part = parseClubParts({ items: [result] })[0];
        if (part.name !== action.name || part.color !== action.color) throw new ApiError('response');
      } else {
        if (!isId(action.part.id)) throw new ApiError('response');
        await client.request(`${base(id)}/parts/${action.part.id}`, { method: 'DELETE' });
      }
    },
  });
}
