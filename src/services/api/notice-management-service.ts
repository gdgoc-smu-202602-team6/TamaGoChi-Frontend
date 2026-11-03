import { createNoticeManagementService } from '../notice-management-service';
import { NoticeManagementError } from '../../types/notice-management';
import { isSessionId as isId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';
import { createApiClubAdminService } from './club-admin-service';
import { parsePublishedNotice } from './notice-compose-service';
import { parseNoticeCategories } from './notice-service';

export function createApiNoticeManagementService(client: HttpClient) {
  const access = createApiClubAdminService(client);
  function identifier(id: string) { if (!isId(id)) throw new ApiError('response'); return id; }
  const base = (club: string) => `/clubs/${identifier(club)}`;
  const path = (club: string, id: string) => `${base(club)}/notices/${identifier(id)}`;
  return createNoticeManagementService({
    async context(clubId) {
      if (!(await access.getPermissions(clubId)).includes('notices.write')) throw new NoticeManagementError('forbidden');
      const [clubResponse, categoryResponse] = await Promise.all([client.request(base(clubId)), client.request(`${base(clubId)}/noticeCategories`)]);
      const club = clubResponse.data as Record<string, unknown> | null;
      if (!club || club.id !== clubId || typeof club.name !== 'string' || !club.name.trim() || !Number.isSafeInteger(club.memberCount) || (club.memberCount as number) < 0) throw new ApiError('response');
      return { club: { id: clubId, name: club.name, memberCount: club.memberCount as number }, categories: parseNoticeCategories(categoryResponse.data) };
    },
    async get(club, id) { return parsePublishedNotice((await client.request(path(club, id))).data); },
    async update(club, id, patch) { return parsePublishedNotice((await client.request(path(club, id), { method: 'PATCH', body: patch })).data); },
    async remove(club, id) { await client.request(path(club, id), { method: 'DELETE' }); },
  });
}
