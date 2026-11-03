import { createClubMembersService } from '../club-members-service';
import { clubPermissions } from '../../types/club-admin';
import { sameMember } from '../../utils/club-members';
import { ClubMembersError, type ClubMember, type ClubRole } from '../../types/club-members';
import { createApiClubAdminService } from './club-admin-service';
import { parseClubParts } from './club-parts-service';
import { isDateTime, isSessionId as isId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('response'); return value as Record<string, unknown>; }
function identifier(value: unknown): string { if (!isId(value)) throw new ApiError('response'); return value; }
function page(value: unknown) {
  const data = object(value);
  if (!Array.isArray(data.items) || (data.nextPageToken !== undefined && (typeof data.nextPageToken !== 'string' || !data.nextPageToken))) throw new ApiError('response');
  return data as { items: unknown[]; nextPageToken?: string };
}
export function parseClubMember(value: unknown, clubId: string): ClubMember {
  const data = object(value);
  if (data.clubId !== clubId || typeof data.userId !== 'string' || !data.userId || typeof data.nickname !== 'string' || !isDateTime(data.joinedAt)) throw new ApiError('response');
  return { id: identifier(data.id), clubId, userId: data.userId, nickname: data.nickname, partId: identifier(data.partId), roleId: identifier(data.roleId), joinedAt: data.joinedAt };
}
export function parseClubRoles(value: unknown): ClubRole[] {
  const roles = page(value).items.map(one => {
    const data = object(one);
    if (typeof data.name !== 'string' || !data.name.trim() || !Array.isArray(data.permissions) || !data.permissions.every(one => clubPermissions.includes(one)) || new Set(data.permissions).size !== data.permissions.length) throw new ApiError('response');
    return { id: identifier(data.id), name: data.name, permissions: data.permissions as ClubRole['permissions'] };
  });
  if (new Set(roles.map(one => one.id)).size !== roles.length) throw new ApiError('response');
  return roles;
}
export function createApiClubMembersService(client: HttpClient) {
  const access = createApiClubAdminService(client), base = (id: string) => `/clubs/${identifier(id)}`;
  return createClubMembersService({
    getPermissions: access.getPermissions,
    async getBoard(id) {
      const path = base(id);
      if (!(await access.getPermissions(id)).includes('members.manage')) throw new ClubMembersError('forbidden');
      const [clubResponse, partResponse, roleResponse, meResponse] = await Promise.all([client.request(path), client.request(`${path}/parts`), client.request('/roles'), client.request(`${path}/members/me`)]);
      const club = object(clubResponse.data), parts = parseClubParts(partResponse.data), roles = parseClubRoles(roleResponse.data), me = parseClubMember(meResponse.data, id);
      if (club.id !== id || typeof club.name !== 'string' || !club.name.trim() || !Number.isSafeInteger(club.memberCount) || (club.memberCount as number) < 1) throw new ApiError('response');
      const members: ClubMember[] = [], tokens = new Set<string>(); let token: string | undefined;
      do {
        const response = page((await client.request(`${path}/members?pageSize=200${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`)).data);
        members.push(...response.items.map(one => parseClubMember(one, id))); token = response.nextPageToken;
        if (token && tokens.has(token)) throw new ApiError('response'); if (token) tokens.add(token);
      } while (token);
      if (new Set(members.map(one => one.id)).size !== members.length || new Set(members.map(one => one.userId)).size !== members.length || !members.some(one => sameMember(one, me)) || !roles.find(one => one.id === me.roleId)?.permissions.includes('members.manage')
        || members.some(one => !parts.some(part => part.id === one.partId) || !roles.some(role => role.id === one.roleId))) throw new ApiError('response');
      return { club: { id, name: club.name, memberCount: club.memberCount as number }, me, members, parts, roles };
    },
    async patch(id, action) { return parseClubMember((await client.request(`${base(id)}/members/${identifier(action.member.id)}`, { method: 'PATCH', body: { roleId: identifier(action.role.id) } })).data, id); },
  });
}
